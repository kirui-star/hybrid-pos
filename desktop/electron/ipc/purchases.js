import {
  randomUUID,
} from "node:crypto";

import {
  getDatabase,
} from "../database/database.js";


const STORE_ID = "store-001";
const REGISTER_ID = "register-001";


const VALID_DISCOUNT_TYPES = [
  "NONE",
  "PERCENT",
  "FIXED",
];


const VALID_PAYMENT_METHODS = [
  "CASH",
  "MPESA",
  "BANK",
  "CREDIT",
  "OTHER",
];


/* =========================================
   HELPERS
========================================= */

function normalizeText(
  value,
) {
  const text =
    String(
      value ?? "",
    ).trim();

  return text || null;
}


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


function createPurchaseNumber() {
  const now =
    new Date();

  const pad =
    (value) =>
      String(value)
        .padStart(
          2,
          "0",
        );


  return [
    "PUR",

    now.getFullYear(),

    pad(
      now.getMonth() + 1,
    ),

    pad(
      now.getDate(),
    ),

    pad(
      now.getHours(),
    ),

    pad(
      now.getMinutes(),
    ),

    pad(
      now.getSeconds(),
    ),

    randomUUID()
      .slice(
        0,
        6,
      )
      .toUpperCase(),
  ].join("-");
}


/* =========================================
   DISCOUNT
========================================= */

function calculateDiscount({
  grossCostCents,
  discountType,
  discountRateBasisPoints,
  discountCents,
}) {

  if (
    !VALID_DISCOUNT_TYPES.includes(
      discountType,
    )
  ) {
    throw new Error(
      "Invalid discount type.",
    );
  }


  if (
    discountType ===
    "NONE"
  ) {
    return {
      discountCents: 0,
      discountRateBasisPoints: null,
    };
  }


  if (
    discountType ===
    "PERCENT"
  ) {
    const rate =
      Number(
        discountRateBasisPoints,
      );


    if (
      !Number.isInteger(
        rate,
      ) ||
      rate < 0 ||
      rate > 10000
    ) {
      throw new Error(
        "Discount percentage is invalid.",
      );
    }


    return {
      discountCents:
        Math.round(
          grossCostCents *
          (
            rate /
            10000
          ),
        ),

      discountRateBasisPoints:
        rate,
    };
  }


  const fixedDiscountCents =
    Number(
      discountCents ??
      0,
    );


  validateMoney(
    fixedDiscountCents,
    "Discount",
  );


  if (
    fixedDiscountCents >
    grossCostCents
  ) {
    throw new Error(
      "Discount cannot exceed the purchase subtotal.",
    );
  }


  return {
    discountCents:
      fixedDiscountCents,

    discountRateBasisPoints:
      null,
  };
}


/* =========================================
   MAP PURCHASE
========================================= */

function mapPurchase(
  row,
) {
  if (!row) {
    return null;
  }


  return {
    id:
      row.id,

    purchaseNumber:
      row.purchase_number,

    storeId:
      row.store_id,

    registerId:
      row.register_id,

    supplierName:
      row.supplier_name,

    paymentMethod:
      row.payment_method,

    referenceNumber:
      row.reference_number,

    subtotalCents:
      Number(
        row.subtotal_cents ??
        0,
      ),

    discountCents:
      Number(
        row.discount_cents ??
        0,
      ),

    totalCents:
      Number(
        row.total_cents ??
        0,
      ),

    status:
      row.status,

    notes:
      row.notes,

    purchasedAt:
      row.purchased_at,

    createdAt:
      row.created_at,
  };
}


/* =========================================
   RECEIVE EXISTING PRODUCT STOCK
========================================= */

function receiveStockPurchase(
  payload,
) {

  if (!payload) {
    throw new Error(
      "Purchase data is required.",
    );
  }


  const productId =
    normalizeText(
      payload.productId,
    );


  if (!productId) {
    throw new Error(
      "Product is required.",
    );
  }


  const quantity =
    Number(
      payload.quantity,
    );


  if (
    !Number.isFinite(
      quantity,
    ) ||
    quantity <= 0
  ) {
    throw new Error(
      "Received quantity must be greater than zero.",
    );
  }


  const supplierUnitCostCents =
    Number(
      payload.supplierUnitCostCents,
    );


  validateMoney(
    supplierUnitCostCents,
    "Purchase cost",
  );


  const paymentMethod =
    String(
      payload.paymentMethod ??
      "CASH",
    )
      .trim()
      .toUpperCase();


  if (
    !VALID_PAYMENT_METHODS.includes(
      paymentMethod,
    )
  ) {
    throw new Error(
      "Invalid purchase payment method.",
    );
  }


  const discountType =
    String(
      payload.discountType ??
      "NONE",
    )
      .trim()
      .toUpperCase();


  const database =
    getDatabase();


  const receiveTransaction =
    database.transaction(
      () => {

        /* =====================================
           PRODUCT
        ===================================== */

        const product =
          database
            .prepare(`
              SELECT
                products.id,
                products.store_id,
                products.name,
                products.barcode,
                products.sku,

                products.cost_price_cents,
                products.selling_price_cents,

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

                AND inventory_balances.register_id =
                  ?

              WHERE products.id = ?

                AND products.store_id = ?

              LIMIT 1
            `)
            .get(
              REGISTER_ID,
              productId,
              STORE_ID,
            );


        if (!product) {
          throw new Error(
            "Product was not found.",
          );
        }


        if (
          !product.is_active
        ) {
          throw new Error(
            "Inactive products cannot receive stock.",
          );
        }


        if (
          !product.track_inventory
        ) {
          throw new Error(
            "This product does not track inventory.",
          );
        }


        /* =====================================
           CURRENT VALUES
        ===================================== */

        const previousQuantity =
          Number(
            product
              .inventory_quantity ??
            0,
          );


        const oldCostCents =
          Number(
            product
              .cost_price_cents ??
            0,
          );


        const previousSellingPriceCents =
          Number(
            product
              .selling_price_cents ??
            0,
          );


        let newSellingPriceCents =
          previousSellingPriceCents;


        if (
          payload
            .newSellingPriceCents !==
            undefined &&
          payload
            .newSellingPriceCents !==
            null &&
          payload
            .newSellingPriceCents !==
            ""
        ) {
          newSellingPriceCents =
            Number(
              payload
                .newSellingPriceCents,
            );


          validateMoney(
            newSellingPriceCents,
            "Selling price",
          );
        }


        /* =====================================
           PURCHASE CALCULATION
        ===================================== */

        const grossCostCents =
          Math.round(
            quantity *
            supplierUnitCostCents,
          );


        const discount =
          calculateDiscount({
            grossCostCents,

            discountType,

            discountRateBasisPoints:
              payload
                .discountRateBasisPoints,

            discountCents:
              payload
                .discountCents,
          });


        const purchaseDiscountCents =
          discount
            .discountCents;


        const netCostCents =
          grossCostCents -
          purchaseDiscountCents;


        const effectiveUnitCostCents =
          quantity > 0
            ? Math.round(
                netCostCents /
                quantity,
              )
            : supplierUnitCostCents;


        /* =====================================
           WEIGHTED AVERAGE COST
        ===================================== */

        const previousInventoryValueCents =
          Math.round(
            previousQuantity *
            oldCostCents,
          );


        const resultingQuantity =
          previousQuantity +
          quantity;


        const resultingInventoryValueCents =
          previousInventoryValueCents +
          netCostCents;


        const averageCostCents =
          resultingQuantity > 0
            ? Math.round(
                resultingInventoryValueCents /
                resultingQuantity,
              )
            : effectiveUnitCostCents;


        /* =====================================
           PURCHASE HEADER
        ===================================== */

        const purchaseId =
          randomUUID();


        const purchaseNumber =
          createPurchaseNumber();


        database
          .prepare(`
            INSERT INTO purchases (
              id,

              purchase_number,

              store_id,

              register_id,

              supplier_name,

              payment_method,

              reference_number,

              subtotal_cents,

              discount_cents,

              total_cents,

              status,

              notes
            )
            VALUES (
              @id,

              @purchaseNumber,

              @storeId,

              @registerId,

              @supplierName,

              @paymentMethod,

              @referenceNumber,

              @subtotalCents,

              @discountCents,

              @totalCents,

              'COMPLETED',

              @notes
            )
          `)
          .run({
            id:
              purchaseId,

            purchaseNumber,

            storeId:
              STORE_ID,

            registerId:
              REGISTER_ID,

            supplierName:
              normalizeText(
                payload
                  .supplierName,
              ),

            paymentMethod,

            referenceNumber:
              normalizeText(
                payload
                  .referenceNumber,
              ),

            subtotalCents:
              grossCostCents,

            discountCents:
              purchaseDiscountCents,

            totalCents:
              netCostCents,

            notes:
              normalizeText(
                payload.notes,
              ),
          });


        /* =====================================
           PURCHASE ITEM
        ===================================== */

        database
          .prepare(`
            INSERT INTO purchase_items (
              id,

              purchase_id,

              product_id,

              product_name,

              barcode,

              sku,

              quantity,

              previous_quantity,

              resulting_quantity,

              old_cost_cents,

              supplier_unit_cost_cents,

              gross_cost_cents,

              discount_type,

              discount_rate_basis_points,

              discount_cents,

              net_cost_cents,

              effective_unit_cost_cents,

              average_cost_cents,

              previous_selling_price_cents,

              new_selling_price_cents
            )
            VALUES (
              @id,

              @purchaseId,

              @productId,

              @productName,

              @barcode,

              @sku,

              @quantity,

              @previousQuantity,

              @resultingQuantity,

              @oldCostCents,

              @supplierUnitCostCents,

              @grossCostCents,

              @discountType,

              @discountRateBasisPoints,

              @discountCents,

              @netCostCents,

              @effectiveUnitCostCents,

              @averageCostCents,

              @previousSellingPriceCents,

              @newSellingPriceCents
            )
          `)
          .run({
            id:
              randomUUID(),

            purchaseId,

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

            quantity,

            previousQuantity,

            resultingQuantity,

            oldCostCents,

            supplierUnitCostCents,

            grossCostCents,

            discountType,

            discountRateBasisPoints:
              discount
                .discountRateBasisPoints,

            discountCents:
              purchaseDiscountCents,

            netCostCents,

            effectiveUnitCostCents,

            averageCostCents,

            previousSellingPriceCents,

            newSellingPriceCents,
          });


        /* =====================================
           INVENTORY BALANCE
        ===================================== */

        database
          .prepare(`
            INSERT INTO inventory_balances (
              product_id,

              register_id,

              quantity,

              updated_at
            )
            VALUES (
              ?,
              ?,
              ?,
              CURRENT_TIMESTAMP
            )

            ON CONFLICT(
              product_id,
              register_id
            )

            DO UPDATE SET

              quantity =
                excluded.quantity,

              updated_at =
                CURRENT_TIMESTAMP
          `)
          .run(
            product.id,
            REGISTER_ID,
            resultingQuantity,
          );


        /* =====================================
           UPDATE PRODUCT COST + SELLING PRICE
        ===================================== */

        database
          .prepare(`
            UPDATE products

            SET
              cost_price_cents = ?,

              selling_price_cents = ?,

              updated_at =
                CURRENT_TIMESTAMP,

              sync_status =
                'PENDING'

            WHERE id = ?

              AND store_id = ?
          `)
          .run(
            averageCostCents,
            newSellingPriceCents,
            product.id,
            STORE_ID,
          );


        /* =====================================
           INVENTORY TRANSACTION HISTORY
        ===================================== */

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

              'RESTOCK',

              @quantityChange,

              @previousQuantity,

              @resultingQuantity,

              @referenceId,

              'Stock purchase',

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
              quantity,

            previousQuantity,

            resultingQuantity,

            referenceId:
              purchaseId,

            notes:
              `Purchase ${purchaseNumber}`,
          });


        /* =====================================
           RESPONSE
        ===================================== */

        return {
          id:
            purchaseId,

          purchaseNumber,

          productId:
            product.id,

          productName:
            product.name,

          previousQuantity,

          receivedQuantity:
            quantity,

          resultingQuantity,

          oldCostCents,

          supplierUnitCostCents,

          grossCostCents,

          purchaseGrossCents:
            grossCostCents,

          discountCents:
            purchaseDiscountCents,

          netCostCents,

          purchaseNetCents:
            netCostCents,

          effectiveUnitCostCents,

          newCostCents:
            effectiveUnitCostCents,

          averageCostCents,

          previousInventoryValueCents,

          resultingInventoryValueCents,

          previousSellingPriceCents,

          newSellingPriceCents,

          paymentMethod,

          supplierName:
            normalizeText(
              payload
                .supplierName,
            ),

          referenceNumber:
            normalizeText(
              payload
                .referenceNumber,
            ),
        };
      },
    );


  return receiveTransaction();
}


/* =========================================
   GET PURCHASES
========================================= */

function getPurchases(
  limit = 200,
) {
  const database =
    getDatabase();


  const safeLimit =
    Math.min(
      Math.max(
        Number(limit) ||
        200,
        1,
      ),
      1000,
    );


  const rows =
    database
      .prepare(`
        SELECT *

        FROM purchases

        WHERE store_id = ?

        ORDER BY
          purchased_at DESC,
          created_at DESC

        LIMIT ?
      `)
      .all(
        STORE_ID,
        safeLimit,
      );


  return rows.map(
    mapPurchase,
  );
}


/* =========================================
   TODAY PURCHASE SUMMARY
========================================= */

function getTodayPurchaseSummary() {
  const database =
    getDatabase();


  const row =
    database
      .prepare(`
        SELECT

          COALESCE(
            SUM(
              total_cents
            ),
            0
          ) AS total_purchases_cents,


          COALESCE(
            SUM(
              CASE
                WHEN payment_method = 'CASH'
                THEN total_cents
                ELSE 0
              END
            ),
            0
          ) AS cash_purchases_cents,


          COALESCE(
            SUM(
              CASE
                WHEN payment_method = 'MPESA'
                THEN total_cents
                ELSE 0
              END
            ),
            0
          ) AS mpesa_purchases_cents,


          COALESCE(
            SUM(
              CASE
                WHEN payment_method = 'BANK'
                THEN total_cents
                ELSE 0
              END
            ),
            0
          ) AS bank_purchases_cents,


          COALESCE(
            SUM(
              CASE
                WHEN payment_method = 'CREDIT'
                THEN total_cents
                ELSE 0
              END
            ),
            0
          ) AS credit_purchases_cents,


          COALESCE(
            SUM(
              CASE
                WHEN payment_method = 'OTHER'
                THEN total_cents
                ELSE 0
              END
            ),
            0
          ) AS other_purchases_cents,


          COUNT(*) AS purchase_count

        FROM purchases

        WHERE store_id = ?

          AND status = 'COMPLETED'

          AND date(
            purchased_at,
            'localtime'
          ) =
          date(
            'now',
            'localtime'
          )
      `)
      .get(
        STORE_ID,
      );


  return {
    totalPurchasesCents:
      Number(
        row
          ?.total_purchases_cents ??
        0,
      ),

    cashPurchasesCents:
      Number(
        row
          ?.cash_purchases_cents ??
        0,
      ),

    mpesaPurchasesCents:
      Number(
        row
          ?.mpesa_purchases_cents ??
        0,
      ),

    bankPurchasesCents:
      Number(
        row
          ?.bank_purchases_cents ??
        0,
      ),

    creditPurchasesCents:
      Number(
        row
          ?.credit_purchases_cents ??
        0,
      ),

    otherPurchasesCents:
      Number(
        row
          ?.other_purchases_cents ??
        0,
      ),

    purchaseCount:
      Number(
        row
          ?.purchase_count ??
        0,
      ),
  };
}


/* =========================================
   REGISTER PURCHASE IPC HANDLERS
========================================= */

export function registerPurchaseHandlers(
  ipcMain,
) {

  /* =====================================
     RECEIVE STOCK
  ===================================== */

  ipcMain.handle(
    "purchases:receiveStock",
    (
      _event,
      payload,
    ) => {
      try {
        return receiveStockPurchase(
          payload,
        );

      } catch (error) {
        console.error(
          "Unable to receive stock purchase:",
          error,
        );

        throw new Error(
          error?.message ||
          "Stock purchase could not be saved.",
        );
      }
    },
  );


  /* =====================================
     GET PURCHASES
  ===================================== */

  ipcMain.handle(
    "purchases:getAll",
    (
      _event,
      limit,
    ) => {
      try {
        return getPurchases(
          limit,
        );

      } catch (error) {
        console.error(
          "Unable to load purchases:",
          error,
        );

        throw new Error(
          error?.message ||
          "Purchases could not be loaded.",
        );
      }
    },
  );


  /* =====================================
     TODAY SUMMARY
  ===================================== */

  ipcMain.handle(
    "purchases:getTodaySummary",
    () => {
      try {
        return getTodayPurchaseSummary();

      } catch (error) {
        console.error(
          "Unable to load today's purchase summary:",
          error,
        );

        throw new Error(
          error?.message ||
          "Purchase summary could not be loaded.",
        );
      }
    },
  );
}