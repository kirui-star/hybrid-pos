import { randomUUID } from "node:crypto";
import { getDatabase } from "../database/database.js";

const STORE_ID = "store-001";
const REGISTER_ID = "register-001";

const DEFAULT_VAT_RATE_BASIS_POINTS = 1600;


/* =========================================
   SALE NUMBER
========================================= */

function createSaleNumber() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      now.getDate(),
    ).padStart(2, "0");

  const hours =
    String(
      now.getHours(),
    ).padStart(2, "0");

  const minutes =
    String(
      now.getMinutes(),
    ).padStart(2, "0");

  const seconds =
    String(
      now.getSeconds(),
    ).padStart(2, "0");

  const randomPart =
    randomUUID()
      .slice(0, 6)
      .toUpperCase();

  return [
    "SALE",
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    randomPart,
  ].join("-");
}


/* =========================================
   MONEY VALIDATION
========================================= */

function validateMoney(
  value,
  fieldName,
) {
  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${fieldName} must be a valid non-negative amount.`,
    );
  }
}


/* =========================================
   SALE VALIDATION
========================================= */

function validateSale(sale) {
  if (!sale) {
    throw new Error(
      "Sale data is required.",
    );
  }


  if (
    !Array.isArray(
      sale.items,
    ) ||
    sale.items.length === 0
  ) {
    throw new Error(
      "The sale must contain at least one item.",
    );
  }


  validateMoney(
    sale.subtotalCents,
    "Subtotal",
  );


  validateMoney(
    sale.discountCents ?? 0,
    "Discount",
  );


  validateMoney(
    sale.taxCents,
    "VAT",
  );


  validateMoney(
    sale.totalCents,
    "Total",
  );


  if (
    Number(
      sale.discountCents ?? 0,
    ) >
    sale.subtotalCents
  ) {
    throw new Error(
      "Discount cannot exceed the sale subtotal.",
    );
  }


  const validDiscountTypes = [
    "NONE",
    "FIXED",
    "PERCENT",
  ];


  const discountType =
    sale.discountType ??
    "NONE";


  if (
    !validDiscountTypes.includes(
      discountType,
    )
  ) {
    throw new Error(
      "Invalid discount type.",
    );
  }


  if (
    discountType === "NONE" &&
    Number(
      sale.discountCents ?? 0,
    ) !== 0
  ) {
    throw new Error(
      "A sale without a discount cannot contain a discount amount.",
    );
  }


  if (
    discountType === "PERCENT"
  ) {
    const rate =
      sale.discountRateBasisPoints;

    if (
      !Number.isInteger(rate) ||
      rate < 0 ||
      rate > 10000
    ) {
      throw new Error(
        "Discount percentage is invalid.",
      );
    }
  }


  const validPaymentMethods = [
    "CASH",
    "MPESA",
    "SPLIT",
  ];


  if (
    !validPaymentMethods.includes(
      sale.paymentMethod,
    )
  ) {
    throw new Error(
      "A valid payment method is required.",
    );
  }


  const cashCents =
    Number(
      sale.payments
        ?.cashCents ??
        0,
    );


  const mpesaCents =
    Number(
      sale.payments
        ?.mpesaCents ??
        0,
    );


  validateMoney(
    cashCents,
    "Cash payment",
  );


  validateMoney(
    mpesaCents,
    "M-Pesa payment",
  );


  /* =====================================
     CASH
  ===================================== */

  if (
    sale.paymentMethod ===
    "CASH"
  ) {
    if (
      cashCents <
      sale.totalCents
    ) {
      throw new Error(
        "Cash received is less than the sale total.",
      );
    }


    if (
      mpesaCents !== 0
    ) {
      throw new Error(
        "A cash sale cannot contain an M-Pesa payment.",
      );
    }
  }


  /* =====================================
     M-PESA
  ===================================== */

  if (
    sale.paymentMethod ===
    "MPESA"
  ) {
    if (
      mpesaCents !==
      sale.totalCents
    ) {
      throw new Error(
        "M-Pesa payment must match the sale total.",
      );
    }


    if (
      cashCents !== 0
    ) {
      throw new Error(
        "An M-Pesa sale cannot contain a cash payment.",
      );
    }
  }


  /* =====================================
     SPLIT
  ===================================== */

  if (
    sale.paymentMethod ===
    "SPLIT"
  ) {
    if (
      cashCents <= 0 ||
      mpesaCents <= 0
    ) {
      throw new Error(
        "Split payment requires both Cash and M-Pesa.",
      );
    }


    if (
      mpesaCents >
      sale.totalCents
    ) {
      throw new Error(
        "The M-Pesa portion cannot exceed the sale total.",
      );
    }


    if (
      cashCents +
        mpesaCents <
      sale.totalCents
    ) {
      throw new Error(
        "Split payment does not cover the sale total.",
      );
    }
  }
}


/* =========================================
   STORE VAT RATE
========================================= */

function getStoreVatRate(
  database,
) {

  /*
   * Ensure the settings row exists.
   *
   * If this store was created before
   * store_settings was introduced,
   * SQLite will create the row using
   * the table default of 16%.
   */

  database
    .prepare(`
      INSERT OR IGNORE INTO store_settings (
        store_id,
        vat_rate_basis_points
      )
      VALUES (?, ?)
    `)
    .run(
      STORE_ID,
      DEFAULT_VAT_RATE_BASIS_POINTS,
    );


  const settings =
    database
      .prepare(`
        SELECT
          vat_rate_basis_points
        FROM store_settings
        WHERE store_id = ?
        LIMIT 1
      `)
      .get(
        STORE_ID,
      );


  const vatRateBasisPoints =
    Number(
      settings
        ?.vat_rate_basis_points ??
        DEFAULT_VAT_RATE_BASIS_POINTS,
    );


  if (
    !Number.isInteger(
      vatRateBasisPoints,
    ) ||
    vatRateBasisPoints < 0 ||
    vatRateBasisPoints > 10000
  ) {
    throw new Error(
      "Store VAT rate is invalid.",
    );
  }


  return vatRateBasisPoints;
}


/* =========================================
   DISCOUNT ALLOCATION
========================================= */

/*
 * The discount belongs to the whole order.
 *
 * We distribute it proportionally across
 * all sale lines.
 *
 * Example:
 *
 * Item A = 600
 * Item B = 400
 * Subtotal = 1000
 *
 * Discount = 100
 *
 * A receives 60 discount
 * B receives 40 discount
 *
 * This matters because VAT should only be
 * charged on the discounted portion of
 * taxable items.
 */

function allocateDiscountAcrossItems(
  items,
  totalDiscountCents,
) {
  if (
    totalDiscountCents <= 0
  ) {
    return items.map(
      () => 0,
    );
  }


  const subtotalCents =
    items.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.lineSubtotalCents,
      0,
    );


  if (
    subtotalCents <= 0
  ) {
    return items.map(
      () => 0,
    );
  }


  const allocations =
    items.map(
      (
        item,
        index,
      ) => {

        const exactAllocation =
          (
            item.lineSubtotalCents *
            totalDiscountCents
          ) /
          subtotalCents;


        const floorAllocation =
          Math.floor(
            exactAllocation,
          );


        return {
          index,

          floorAllocation,

          fraction:
            exactAllocation -
            floorAllocation,
        };
      },
    );


  let allocatedCents =
    allocations.reduce(
      (
        total,
        allocation,
      ) =>
        total +
        allocation.floorAllocation,
      0,
    );


  let remainingCents =
    totalDiscountCents -
    allocatedCents;


  allocations
    .sort(
      (
        first,
        second,
      ) =>
        second.fraction -
        first.fraction,
    );


  for (
    let index = 0;
    index <
    allocations.length &&
    remainingCents > 0;
    index += 1
  ) {
    allocations[index]
      .floorAllocation += 1;

    remainingCents -= 1;
  }


  const results =
    new Array(
      items.length,
    ).fill(0);


  for (
    const allocation
    of allocations
  ) {
    results[
      allocation.index
    ] =
      Math.min(
        allocation.floorAllocation,
        items[
          allocation.index
        ].lineSubtotalCents,
      );
  }


  return results;
}


/* =========================================
   REGISTER SALE HANDLERS
========================================= */

export function registerSaleHandlers(
  ipcMain,
) {

  ipcMain.handle(
    "sales:complete",
    (
      _event,
      sale,
    ) => {

      validateSale(sale);


      const database =
        getDatabase();


      const saleId =
        randomUUID();


      const saleNumber =
        createSaleNumber();


      const completeSaleTransaction =
        database.transaction(() => {

          /* =====================================
             STORE VAT
          ===================================== */

          const vatRateBasisPoints =
            getStoreVatRate(
              database,
            );


          /* =====================================
             VALIDATE PRODUCTS
          ===================================== */

          let calculatedSubtotalCents =
            0;


          const validatedItems = [];


          for (
            const saleItem
            of sale.items
          ) {

            if (
              !saleItem.productId
            ) {
              throw new Error(
                "A sale item is missing its product ID.",
              );
            }


            const quantity =
              Number(
                saleItem.quantity,
              );


            if (
              !Number.isFinite(
                quantity,
              ) ||
              quantity <= 0
            ) {
              throw new Error(
                "Sale item quantity must be greater than zero.",
              );
            }


            const product =
              database
                .prepare(`
                  SELECT
                    products.id,
                    products.store_id,
                    products.name,
                    products.barcode,
                    products.sku,

                    products.selling_price_cents,

                    products.cost_price_cents,

                    products.is_taxable,

                    products.track_inventory,

                    products.is_active,

                    COALESCE(
                      inventory_balances.quantity,
                      0
                    ) AS inventory_quantity

                  FROM products

                  LEFT JOIN inventory_balances
                    ON inventory_balances.product_id =
                      products.id

                    AND inventory_balances.register_id = ?

                  WHERE products.id = ?

                    AND products.store_id = ?

                  LIMIT 1
                `)
                .get(
                  REGISTER_ID,
                  saleItem.productId,
                  STORE_ID,
                );


            if (!product) {
              throw new Error(
                "One of the products in this sale no longer exists.",
              );
            }


            if (
              !product.is_active
            ) {
              throw new Error(
                `"${product.name}" is inactive and cannot be sold.`,
              );
            }


            if (
              product.track_inventory &&
              Number(
                product.inventory_quantity,
              ) <
                quantity
            ) {
              throw new Error(
                `Not enough stock for "${product.name}". Available: ${product.inventory_quantity}.`,
              );
            }


            /*
             * The backend uses the current
             * database price rather than
             * trusting the renderer.
             */

            const lineSubtotalCents =
              Math.round(
                product.selling_price_cents *
                quantity,
              );


            calculatedSubtotalCents +=
              lineSubtotalCents;


            validatedItems.push({
              product,

              quantity,

              lineSubtotalCents,

              discountCents: 0,

              taxableAmountCents: 0,

              taxCents: 0,

              lineTotalCents: 0,
            });
          }


          /* =====================================
             VERIFY SUBTOTAL
          ===================================== */

          if (
            calculatedSubtotalCents !==
            sale.subtotalCents
          ) {
            throw new Error(
              "Sale subtotal changed. Please review the cart and try again.",
            );
          }


          /* =====================================
             VALIDATE DISCOUNT
          ===================================== */

          const discountCents =
            Number(
              sale.discountCents ??
              0,
            );


          if (
            discountCents >
            calculatedSubtotalCents
          ) {
            throw new Error(
              "Discount cannot exceed the sale subtotal.",
            );
          }


          if (
            sale.discountType ===
            "PERCENT"
          ) {
            const expectedDiscount =
              Math.round(
                calculatedSubtotalCents *
                (
                  sale.discountRateBasisPoints /
                  10000
                ),
              );


            if (
              expectedDiscount !==
              discountCents
            ) {
              throw new Error(
                "Discount changed. Please review the sale and try again.",
              );
            }
          }


          /* =====================================
             ALLOCATE DISCOUNT TO ITEMS
          ===================================== */

          const itemDiscounts =
            allocateDiscountAcrossItems(
              validatedItems,
              discountCents,
            );


          let calculatedTaxCents =
            0;


          let calculatedTotalCents =
            0;


          for (
            let index = 0;
            index <
            validatedItems.length;
            index += 1
          ) {
            const item =
              validatedItems[index];


            const itemDiscountCents =
              itemDiscounts[index];


            const discountedLineCents =
              Math.max(
                item.lineSubtotalCents -
                  itemDiscountCents,
                0,
              );


            /*
             * Global VAT applies only when
             * product.is_taxable = 1.
             */

            const isTaxable =
              Boolean(
                item.product
                  .is_taxable,
              );


            const itemTaxCents =
              isTaxable
                ? Math.round(
                    discountedLineCents *
                    (
                      vatRateBasisPoints /
                      10000
                    ),
                  )
                : 0;


            const lineTotalCents =
              discountedLineCents +
              itemTaxCents;


            item.discountCents =
              itemDiscountCents;


            item.taxableAmountCents =
              isTaxable
                ? discountedLineCents
                : 0;


            item.taxCents =
              itemTaxCents;


            item.lineTotalCents =
              lineTotalCents;


            calculatedTaxCents +=
              itemTaxCents;


            calculatedTotalCents +=
              lineTotalCents;
          }


          /* =====================================
             VERIFY VAT
          ===================================== */

          if (
            calculatedTaxCents !==
            sale.taxCents
          ) {
            throw new Error(
              "Sale VAT changed. Please review the cart and try again.",
            );
          }


          /* =====================================
             VERIFY FINAL TOTAL
          ===================================== */

          const expectedTotalCents =
            calculatedSubtotalCents -
            discountCents +
            calculatedTaxCents;


          if (
            expectedTotalCents !==
            calculatedTotalCents
          ) {
            throw new Error(
              "Unable to calculate the sale total.",
            );
          }


          if (
            expectedTotalCents !==
            sale.totalCents
          ) {
            throw new Error(
              "Sale total changed. Please review the cart and try again.",
            );
          }


          /* =====================================
             VERIFY CHANGE
          ===================================== */

          const cashReceivedCents =
            Number(
              sale.payments
                ?.cashCents ??
                0,
            );


          const mpesaReceivedCents =
            Number(
              sale.payments
                ?.mpesaCents ??
                0,
            );


          let expectedChangeCents =
            0;


          if (
            sale.paymentMethod ===
            "CASH"
          ) {
            expectedChangeCents =
              Math.max(
                cashReceivedCents -
                expectedTotalCents,
                0,
              );
          }


          if (
            sale.paymentMethod ===
            "SPLIT"
          ) {
            const cashNeededCents =
              Math.max(
                expectedTotalCents -
                mpesaReceivedCents,
                0,
              );


            expectedChangeCents =
              Math.max(
                cashReceivedCents -
                cashNeededCents,
                0,
              );
          }


          if (
            Number(
              sale.changeDueCents ??
              0,
            ) !==
            expectedChangeCents
          ) {
            throw new Error(
              "Payment change amount changed. Please review the payment.",
            );
          }


          /* =====================================
             CREATE SALE
          ===================================== */

          database
            .prepare(`
              INSERT INTO sales (
                id,
                sale_number,
                store_id,
                register_id,

                subtotal_cents,

                discount_type,
                discount_cents,
                discount_rate_basis_points,
                discount_reason,

                tax_cents,
                total_cents,

                payment_method,

                status
              )
              VALUES (
                @id,
                @saleNumber,
                @storeId,
                @registerId,

                @subtotalCents,

                @discountType,
                @discountCents,
                @discountRateBasisPoints,
                @discountReason,

                @taxCents,
                @totalCents,

                @paymentMethod,

                'COMPLETED'
              )
            `)
            .run({
              id:
                saleId,

              saleNumber,

              storeId:
                STORE_ID,

              registerId:
                REGISTER_ID,

              subtotalCents:
                calculatedSubtotalCents,

              discountType:
                sale.discountType ??
                "NONE",

              discountCents,

              discountRateBasisPoints:
                sale.discountType ===
                "PERCENT"
                  ? sale
                      .discountRateBasisPoints
                  : null,

              discountReason:
                String(
                  sale.discountReason ??
                  "",
                ).trim() ||
                null,

              taxCents:
                calculatedTaxCents,

              totalCents:
                expectedTotalCents,

              paymentMethod:
                sale.paymentMethod,
            });


          /* =====================================
             CREATE SALE ITEMS
             + REDUCE INVENTORY
          ===================================== */

          for (
            const item
            of validatedItems
          ) {

            const product =
              item.product;


            const saleItemId =
              randomUUID();


            database
              .prepare(`
                INSERT INTO sale_items (
                  id,
                  sale_id,
                  product_id,

                  product_name,
                  barcode,
                  sku,

                  quantity,

                  unit_price_cents,

                  unit_cost_cents,

                  tax_cents,

                  discount_cents,

                  line_total_cents
                )
                VALUES (
                  @id,
                  @saleId,
                  @productId,

                  @productName,
                  @barcode,
                  @sku,

                  @quantity,

                  @unitPriceCents,

                  @unitCostCents,

                  @taxCents,

                  @discountCents,

                  @lineTotalCents
                )
              `)
              .run({
                id:
                  saleItemId,

                saleId,

                productId:
                  product.id,

                productName:
                  product.name,

                barcode:
                  product.barcode ??
                  null,

                sku:
                  product.sku ??
                  null,

                quantity:
                  item.quantity,

                unitPriceCents:
                  product
                    .selling_price_cents,

                unitCostCents:
                  product
                    .cost_price_cents,

                taxCents:
                  item.taxCents,

                discountCents:
                  item.discountCents,

                lineTotalCents:
                  item.lineTotalCents,
              });


            /* =================================
               INVENTORY
            ================================= */

            if (
              product.track_inventory
            ) {

              const previousQuantity =
                Number(
                  product
                    .inventory_quantity,
                );


              const resultingQuantity =
                previousQuantity -
                item.quantity;


              const inventoryUpdate =
                database
                  .prepare(`
                    UPDATE inventory_balances

                    SET
                      quantity = ?,

                      updated_at =
                        CURRENT_TIMESTAMP

                    WHERE product_id = ?

                      AND register_id = ?

                      AND quantity >= ?
                  `)
                  .run(
                    resultingQuantity,
                    product.id,
                    REGISTER_ID,
                    item.quantity,
                  );


              if (
                inventoryUpdate
                  .changes === 0
              ) {
                throw new Error(
                  `Inventory changed while completing the sale for "${product.name}". Please try again.`,
                );
              }


              database
                .prepare(`
                  INSERT INTO inventory_transactions (
                    id,

                    product_id,

                    register_id,

                    transaction_type,

                    quantity_change,

                    previous_quantity,

                    resulting_quantity,

                    reference_id,

                    reason,

                    notes
                  )
                  VALUES (
                    @id,

                    @productId,

                    @registerId,

                    'SALE',

                    @quantityChange,

                    @previousQuantity,

                    @resultingQuantity,

                    @referenceId,

                    'Product sale',

                    @notes
                  )
                `)
                .run({
                  id:
                    randomUUID(),

                  productId:
                    product.id,

                  registerId:
                    REGISTER_ID,

                  quantityChange:
                    -item.quantity,

                  previousQuantity,

                  resultingQuantity,

                  referenceId:
                    saleId,

                  notes:
                    `Sale ${saleNumber}`,
                });
            }
          }


          /* =====================================
             PAYMENTS
          ===================================== */

          const changeGivenCents =
            expectedChangeCents;


          /* =================================
             CASH PAYMENT
          ================================= */

          if (
            sale.paymentMethod ===
              "CASH" ||
            sale.paymentMethod ===
              "SPLIT"
          ) {

            if (
              cashReceivedCents >
              0
            ) {

              let cashAppliedCents;


              if (
                sale.paymentMethod ===
                "SPLIT"
              ) {
                cashAppliedCents =
                  Math.max(
                    expectedTotalCents -
                    mpesaReceivedCents,
                    0,
                  );

              } else {

                cashAppliedCents =
                  expectedTotalCents;
              }


              database
                .prepare(`
                  INSERT INTO payments (
                    id,
                    sale_id,
                    payment_method,

                    amount_cents,

                    amount_received_cents,

                    change_given_cents
                  )
                  VALUES (
                    ?,
                    ?,
                    'CASH',
                    ?,
                    ?,
                    ?
                  )
                `)
                .run(
                  randomUUID(),

                  saleId,

                  cashAppliedCents,

                  cashReceivedCents,

                  changeGivenCents,
                );
            }
          }


          /* =================================
             M-PESA PAYMENT
          ================================= */

          if (
            sale.paymentMethod ===
              "MPESA" ||
            sale.paymentMethod ===
              "SPLIT"
          ) {

            if (
              mpesaReceivedCents >
              0
            ) {

              database
                .prepare(`
                  INSERT INTO payments (
                    id,
                    sale_id,
                    payment_method,

                    amount_cents,

                    amount_received_cents,

                    change_given_cents,

                    reference_number
                  )
                  VALUES (
                    ?,
                    ?,
                    'MOBILE_MONEY',
                    ?,
                    ?,
                    0,
                    ?
                  )
                `)
                .run(
                  randomUUID(),

                  saleId,

                  mpesaReceivedCents,

                  mpesaReceivedCents,

                  sale.mpesaReference ??
                  null,
                );
            }
          }


          /* =====================================
             COMPLETED SALE RESPONSE
          ===================================== */

          return {
            id:
              saleId,

            saleNumber,

            subtotalCents:
              calculatedSubtotalCents,

            discountCents,

            vatRateBasisPoints,

            taxCents:
              calculatedTaxCents,

            totalCents:
              expectedTotalCents,

            paymentMethod:
              sale.paymentMethod,

            cashCents:
              cashReceivedCents,

            mpesaCents:
              mpesaReceivedCents,

            changeDueCents:
              changeGivenCents,

            status:
              "COMPLETED",
          };
        });


      try {
        return completeSaleTransaction();

      } catch (error) {
        console.error(
          "Unable to complete sale:",
          error,
        );

        throw new Error(
          error?.message ||
          "The sale could not be completed.",
        );
      }
    },
  );

  /* =========================================
     HELD SALES
  ========================================= */

  function ensureHeldSalesTable(
    database,
  ) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS held_sales (
        id TEXT PRIMARY KEY,

        store_id TEXT NOT NULL,
        register_id TEXT NOT NULL,

        label TEXT,

        cart_json TEXT NOT NULL,

        status TEXT NOT NULL DEFAULT 'ACTIVE'
          CHECK (
            status IN (
              'ACTIVE',
              'COMPLETED',
              'CANCELLED'
            )
          ),

        held_at TEXT NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL
          DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS
        idx_held_sales_active
      ON held_sales(
        store_id,
        register_id,
        status,
        held_at
      );
    `);
  }


  ipcMain.handle(
    "sales:hold",
    (
      _event,
      payload,
    ) => {

      const database =
        getDatabase();

      ensureHeldSalesTable(
        database,
      );


      const items =
        Array.isArray(
          payload?.items,
        )
          ? payload.items
          : [];


      if (
        items.length === 0
      ) {
        throw new Error(
          "There are no items to hold.",
        );
      }


      const heldSaleId =
        randomUUID();


      const snapshot = {
        items,

        discountType:
          payload?.discountType ??
          "NONE",

        discountValue:
          payload?.discountValue ??
          "",

        discountCents:
          Number(
            payload?.discountCents ??
            0,
          ),

        customer:
          payload?.customer ??
          null,
      };


      database
        .prepare(`
          INSERT INTO held_sales (
            id,
            store_id,
            register_id,
            label,
            cart_json,
            status
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            'ACTIVE'
          )
        `)
        .run(
          heldSaleId,
          STORE_ID,
          REGISTER_ID,
          String(
            payload?.label ??
            "",
          ).trim() ||
            null,
          JSON.stringify(
            snapshot,
          ),
        );


      return {
        success: true,
        id: heldSaleId,
      };
    },
  );


  ipcMain.handle(
    "sales:getHeld",
    () => {

      const database =
        getDatabase();

      ensureHeldSalesTable(
        database,
      );


      const rows =
        database
          .prepare(`
            SELECT
              id,
              label,
              cart_json,
              held_at,
              updated_at

            FROM held_sales

            WHERE store_id = ?
              AND register_id = ?
              AND status = 'ACTIVE'

            ORDER BY held_at DESC
          `)
          .all(
            STORE_ID,
            REGISTER_ID,
          );


      return rows.map(
        (row) => {

          let snapshot = {};

          try {
            snapshot =
              JSON.parse(
                row.cart_json,
              );
          } catch {
            snapshot = {};
          }


          const items =
            Array.isArray(
              snapshot?.items,
            )
              ? snapshot.items
              : [];


          const itemCount =
            items.reduce(
              (
                total,
                item,
              ) =>
                total +
                Number(
                  item.quantity ??
                  0,
                ),
              0,
            );


          const subtotalCents =
            items.reduce(
              (
                total,
                item,
              ) =>
                total +
                Math.round(
                  Number(
                    item.selling_price_cents ??
                    item.unitPriceCents ??
                    0,
                  ) *
                    Number(
                      item.quantity ??
                      0,
                    ),
                ),
              0,
            );


          return {
            id:
              row.id,

            label:
              row.label,

            heldAt:
              row.held_at,

            updatedAt:
              row.updated_at,

            itemCount,

            subtotalCents,
          };
        },
      );
    },
  );


  ipcMain.handle(
    "sales:getHeldById",
    (
      _event,
      heldSaleId,
    ) => {

      if (
        !heldSaleId
      ) {
        throw new Error(
          "Held sale ID is required.",
        );
      }


      const database =
        getDatabase();

      ensureHeldSalesTable(
        database,
      );


      const row =
        database
          .prepare(`
            SELECT
              id,
              label,
              cart_json,
              held_at

            FROM held_sales

            WHERE id = ?
              AND store_id = ?
              AND register_id = ?
              AND status = 'ACTIVE'

            LIMIT 1
          `)
          .get(
            heldSaleId,
            STORE_ID,
            REGISTER_ID,
          );


      if (!row) {
        throw new Error(
          "Held sale was not found.",
        );
      }


      let snapshot;

      try {
        snapshot =
          JSON.parse(
            row.cart_json,
          );
      } catch {
        throw new Error(
          "Held sale data is invalid.",
        );
      }


      return {
        id:
          row.id,

        label:
          row.label,

        heldAt:
          row.held_at,

        items:
          Array.isArray(
            snapshot?.items,
          )
            ? snapshot.items
            : [],

        discountType:
          snapshot?.discountType ??
          "NONE",

        discountValue:
          snapshot?.discountValue ??
          "",

        discountCents:
          Number(
            snapshot?.discountCents ??
            0,
          ),

        customer:
          snapshot?.customer ??
          null,
      };
    },
  );


  ipcMain.handle(
    "sales:closeHeld",
    (
      _event,
      heldSaleId,
      status = "COMPLETED",
    ) => {

      if (
        !heldSaleId
      ) {
        throw new Error(
          "Held sale ID is required.",
        );
      }


      const normalizedStatus =
        status === "CANCELLED"
          ? "CANCELLED"
          : "COMPLETED";


      const database =
        getDatabase();

      ensureHeldSalesTable(
        database,
      );


      const result =
        database
          .prepare(`
            UPDATE held_sales

            SET
              status = ?,
              updated_at =
                CURRENT_TIMESTAMP

            WHERE id = ?
              AND store_id = ?
              AND register_id = ?
              AND status = 'ACTIVE'
          `)
          .run(
            normalizedStatus,
            heldSaleId,
            STORE_ID,
            REGISTER_ID,
          );


      return {
        success:
          result.changes > 0,
      };
    },
  );


}