import { randomUUID } from "node:crypto";
import { getDatabase } from "../database/database.js";

const STORE_ID = "store-001";
const REGISTER_ID = "register-001";


/* =========================================
   HELPERS
========================================= */

function normalizeOptionalText(value) {
  const normalizedValue =
    String(value ?? "").trim();

  return normalizedValue || null;
}


function validateProduct(product) {
  const name =
    String(product?.name ?? "").trim();

  if (!name) {
    throw new Error(
      "Product name is required.",
    );
  }

  if (
    !Number.isInteger(
      product.sellingPriceCents,
    )
  ) {
    throw new Error(
      "Selling price must be a valid amount.",
    );
  }

  if (
    product.sellingPriceCents < 0
  ) {
    throw new Error(
      "Selling price cannot be negative.",
    );
  }

  if (
    !Number.isInteger(
      product.costPriceCents,
    )
  ) {
    throw new Error(
      "Cost price must be a valid amount.",
    );
  }

  if (
    product.costPriceCents < 0
  ) {
    throw new Error(
      "Cost price cannot be negative.",
    );
  }

  const taxRateBasisPoints =
    product.taxRateBasisPoints ?? 0;

  if (
    !Number.isInteger(
      taxRateBasisPoints,
    ) ||
    taxRateBasisPoints < 0 ||
    taxRateBasisPoints > 10000
  ) {
    throw new Error(
      "Tax rate must be between 0% and 100%.",
    );
  }

  if (
    product.isTaxable !== undefined &&
    typeof product.isTaxable !== "boolean"
  ) {
    throw new Error(
      "Tax status must be either taxed or zero-rated.",
    );
  }
}


/* =========================================
   GET PRODUCT BY ID
========================================= */

function getProductById(
  database,
  productId,
) {
  return database
    .prepare(`
      SELECT
        products.id,
        products.category_id,
        categories.name AS category_name,
        products.barcode,
        products.sku,
        products.name,
        products.description,
        products.selling_price_cents,
        products.cost_price_cents,
        products.tax_rate_basis_points,
        products.is_taxable,
        products.track_inventory,
        products.is_active,
        products.created_at,
        products.updated_at,

        COALESCE(
          inventory_balances.quantity,
          0
        ) AS inventory_quantity

      FROM products

      LEFT JOIN categories
        ON categories.id =
          products.category_id

      LEFT JOIN inventory_balances
        ON inventory_balances.product_id =
          products.id
        AND inventory_balances.register_id = ?

      WHERE products.id = ?
        AND products.store_id = ?
    `)
    .get(
      REGISTER_ID,
      productId,
      STORE_ID,
    );
}


/* =========================================
   FRIENDLY DATABASE ERRORS
========================================= */

function throwFriendlyProductError(
  error,
  action,
) {
  const message =
    String(error?.message ?? "");

  if (
    message.includes(
      "UNIQUE constraint failed: products.store_id, products.barcode",
    )
  ) {
    throw new Error(
      "Another product already uses this barcode.",
    );
  }

  if (
    message.includes(
      "UNIQUE constraint failed: products.store_id, products.sku",
    )
  ) {
    throw new Error(
      "Another product already uses this SKU.",
    );
  }

  console.error(
    `Unable to ${action} product:`,
    error,
  );

  const actionMessage = {
    create: "saved",
    update: "updated",
    deactivate: "deactivated",
    activate: "activated",
    delete: "deleted",
  };

  throw new Error(
    `The product could not be ${
      actionMessage[action] ??
      "processed"
    }.`,
  );
}


/* =========================================
   REGISTER PRODUCT HANDLERS
========================================= */

export function registerProductHandlers(
  ipcMain,
) {

  /* =========================================
     GET ALL PRODUCTS
  ========================================= */

  ipcMain.handle(
    "products:getAll",
    () => {
      const database =
        getDatabase();

      return database
        .prepare(`
          SELECT
            products.id,
            products.category_id,
            categories.name AS category_name,
            products.barcode,
            products.sku,
            products.name,
            products.description,
            products.selling_price_cents,
            products.cost_price_cents,
            products.tax_rate_basis_points,
            products.is_taxable,
            products.track_inventory,
            products.is_active,
            products.created_at,
            products.updated_at,

            COALESCE(
              inventory_balances.quantity,
              0
            ) AS inventory_quantity

          FROM products

          LEFT JOIN categories
            ON categories.id =
              products.category_id

          LEFT JOIN inventory_balances
            ON inventory_balances.product_id =
              products.id
            AND inventory_balances.register_id = ?

          WHERE products.store_id = ?

          ORDER BY products.name
        `)
        .all(
          REGISTER_ID,
          STORE_ID,
        );
    },
  );


  /* =========================================
     GET PRODUCT BY BARCODE
  ========================================= */

  ipcMain.handle(
    "products:getByBarcode",
    (_event, barcode) => {
      const normalizedBarcode =
        String(
          barcode ?? "",
        ).trim();

      if (!normalizedBarcode) {
        throw new Error(
          "Barcode is required.",
        );
      }

      const database =
        getDatabase();

      const product =
        database
          .prepare(`
            SELECT
              products.id,
              products.category_id,
              categories.name AS category_name,
              products.barcode,
              products.sku,
              products.name,
              products.description,
              products.selling_price_cents,
              products.cost_price_cents,
              products.tax_rate_basis_points,
              products.is_taxable,
              products.track_inventory,
              products.is_active,
              products.created_at,
              products.updated_at,

              COALESCE(
                inventory_balances.quantity,
                0
              ) AS inventory_quantity

            FROM products

            LEFT JOIN categories
              ON categories.id =
                products.category_id

            LEFT JOIN inventory_balances
              ON inventory_balances.product_id =
                products.id
              AND inventory_balances.register_id = ?

            WHERE products.store_id = ?
              AND products.barcode = ?
              AND products.is_active = 1

            LIMIT 1
          `)
          .get(
            REGISTER_ID,
            STORE_ID,
            normalizedBarcode,
          );

      return product ?? null;
    },
  );


  /* =========================================
     CREATE PRODUCT
  ========================================= */

  ipcMain.handle(
    "products:create",
    (_event, product) => {
      validateProduct(product);

      const database =
        getDatabase();

      const productId =
        randomUUID();

      try {
        const createProduct =
          database.transaction(() => {

            /* -----------------------------
               Create product
            ----------------------------- */

            database
              .prepare(`
                INSERT INTO products (
                  id,
                  store_id,
                  category_id,
                  barcode,
                  sku,
                  name,
                  description,
                  selling_price_cents,
                  cost_price_cents,
                  tax_rate_basis_points,
                  is_taxable,
                  track_inventory,
                  is_active
                )
                VALUES (
                  @id,
                  @storeId,
                  @categoryId,
                  @barcode,
                  @sku,
                  @name,
                  @description,
                  @sellingPriceCents,
                  @costPriceCents,
                  @taxRateBasisPoints,
                  @isTaxable,
                  @trackInventory,
                  1
                )
              `)
              .run({
                id: productId,

                storeId:
                  STORE_ID,

                categoryId:
                  normalizeOptionalText(
                    product.categoryId,
                  ),

                barcode:
                  normalizeOptionalText(
                    product.barcode,
                  ),

                sku:
                  normalizeOptionalText(
                    product.sku,
                  ),

                name:
                  String(
                    product.name,
                  ).trim(),

                description:
                  normalizeOptionalText(
                    product.description,
                  ),

                sellingPriceCents:
                  product.sellingPriceCents,

                costPriceCents:
                  product.costPriceCents,

                /*
                 * Legacy field.
                 *
                 * The actual VAT percentage
                 * will come from store_settings.
                 */
                taxRateBasisPoints:
                  product.taxRateBasisPoints ??
                  0,

                /*
                 * Products are taxable by
                 * default.
                 *
                 * false = zero-rated
                 * true  = taxable
                 */
                isTaxable:
                  product.isTaxable === false
                    ? 0
                    : 1,

                trackInventory:
                  product.trackInventory
                    ? 1
                    : 0,
              });


            /* -----------------------------
               Create inventory balance
            ----------------------------- */

            if (
              product.trackInventory
            ) {
              database
                .prepare(`
                  INSERT INTO inventory_balances (
                    product_id,
                    register_id,
                    quantity
                  )
                  VALUES (?, ?, 0)
                `)
                .run(
                  productId,
                  REGISTER_ID,
                );
            }
          });


        createProduct();


        return getProductById(
          database,
          productId,
        );

      } catch (error) {
        throwFriendlyProductError(
          error,
          "create",
        );
      }
    },
  );


  /* =========================================
     UPDATE PRODUCT
  ========================================= */

  ipcMain.handle(
    "products:update",
    (
      _event,
      productId,
      product,
    ) => {
      if (!productId) {
        throw new Error(
          "Product ID is required.",
        );
      }

      validateProduct(product);

      const database =
        getDatabase();


      /* -----------------------------
         Confirm product exists
      ----------------------------- */

      const existingProduct =
        database
          .prepare(`
            SELECT
              id,
              track_inventory,
              is_taxable
            FROM products
            WHERE id = ?
              AND store_id = ?
          `)
          .get(
            productId,
            STORE_ID,
          );

      if (!existingProduct) {
        throw new Error(
          "Product was not found.",
        );
      }


      try {
        const updateProduct =
          database.transaction(() => {

            /* -----------------------------
               Update product
            ----------------------------- */

            database
              .prepare(`
                UPDATE products
                SET
                  category_id =
                    @categoryId,

                  barcode =
                    @barcode,

                  sku =
                    @sku,

                  name =
                    @name,

                  description =
                    @description,

                  selling_price_cents =
                    @sellingPriceCents,

                  cost_price_cents =
                    @costPriceCents,

                  tax_rate_basis_points =
                    @taxRateBasisPoints,

                  is_taxable =
                    @isTaxable,

                  track_inventory =
                    @trackInventory,

                  updated_at =
                    CURRENT_TIMESTAMP

                WHERE id =
                  @productId

                  AND store_id =
                    @storeId
              `)
              .run({
                productId,

                storeId:
                  STORE_ID,

                categoryId:
                  normalizeOptionalText(
                    product.categoryId,
                  ),

                barcode:
                  normalizeOptionalText(
                    product.barcode,
                  ),

                sku:
                  normalizeOptionalText(
                    product.sku,
                  ),

                name:
                  String(
                    product.name,
                  ).trim(),

                description:
                  normalizeOptionalText(
                    product.description,
                  ),

                sellingPriceCents:
                  product.sellingPriceCents,

                costPriceCents:
                  product.costPriceCents,

                taxRateBasisPoints:
                  product.taxRateBasisPoints ??
                  0,

                isTaxable:
                  product.isTaxable === false
                    ? 0
                    : 1,

                trackInventory:
                  product.trackInventory
                                      ? 1
                    : 0,
              });


            /* -----------------------------
               Ensure inventory balance
               exists when inventory
               tracking is enabled
            ----------------------------- */

            const inventoryBalance =
              database
                .prepare(`
                  SELECT
                    product_id
                  FROM inventory_balances
                  WHERE product_id = ?
                    AND register_id = ?
                `)
                .get(
                  productId,
                  REGISTER_ID,
                );

            if (
              product.trackInventory &&
              !inventoryBalance
            ) {
              database
                .prepare(`
                  INSERT INTO inventory_balances (
                    product_id,
                    register_id,
                    quantity
                  )
                  VALUES (?, ?, 0)
                `)
                .run(
                  productId,
                  REGISTER_ID,
                );
            }
          });


        updateProduct();


        return getProductById(
          database,
          productId,
        );

      } catch (error) {
        throwFriendlyProductError(
          error,
          "update",
        );
      }
    },
  );


  /* =========================================
     DEACTIVATE PRODUCT
  ========================================= */

  ipcMain.handle(
    "products:deactivate",
    (_event, productId) => {
      if (!productId) {
        throw new Error(
          "Product ID is required.",
        );
      }

      const database =
        getDatabase();

      try {
        const result =
          database
            .prepare(`
              UPDATE products
              SET
                is_active = 0,
                updated_at =
                  CURRENT_TIMESTAMP
              WHERE id = ?
                AND store_id = ?
            `)
            .run(
              productId,
              STORE_ID,
            );

        if (
          result.changes === 0
        ) {
          throw new Error(
            "Product was not found.",
          );
        }

        return getProductById(
          database,
          productId,
        );

      } catch (error) {
        if (
          error.message ===
          "Product was not found."
        ) {
          throw error;
        }

        throwFriendlyProductError(
          error,
          "deactivate",
        );
      }
    },
  );


  /* =========================================
     ACTIVATE PRODUCT
  ========================================= */

  ipcMain.handle(
    "products:activate",
    (_event, productId) => {
      if (!productId) {
        throw new Error(
          "Product ID is required.",
        );
      }

      const database =
        getDatabase();

      try {
        const result =
          database
            .prepare(`
              UPDATE products
              SET
                is_active = 1,
                updated_at =
                  CURRENT_TIMESTAMP
              WHERE id = ?
                AND store_id = ?
            `)
            .run(
              productId,
              STORE_ID,
            );

        if (
          result.changes === 0
        ) {
          throw new Error(
            "Product was not found.",
          );
        }

        return getProductById(
          database,
          productId,
        );

      } catch (error) {
        if (
          error.message ===
          "Product was not found."
        ) {
          throw error;
        }

        throwFriendlyProductError(
          error,
          "activate",
        );
      }
    },
  );


  /* =========================================
     DELETE PRODUCT
  ========================================= */

  ipcMain.handle(
    "products:delete",
    (
      _event,
      productId,
    ) => {

      if (!productId) {
        throw new Error(
          "Product ID is required.",
        );
      }


      const database =
        getDatabase();


      const existingProduct =
        getProductById(
          database,
          productId,
        );


      if (!existingProduct) {
        throw new Error(
          "Product was not found.",
        );
      }


      try {

        const deleteProduct =
          database.transaction(
            () => {

              /* =====================================
                 CHECK SALE HISTORY
              ===================================== */

              const saleHistory =
                database
                  .prepare(`
                    SELECT
                      COUNT(*) AS count

                    FROM sale_items

                    WHERE product_id = ?
                  `)
                  .get(
                    productId,
                  );


              /* =====================================
                 CHECK PURCHASE HISTORY
              ===================================== */

              const purchaseHistory =
                database
                  .prepare(`
                    SELECT
                      COUNT(*) AS count

                    FROM purchase_items

                    WHERE product_id = ?
                  `)
                  .get(
                    productId,
                  );


              /* =====================================
                 CHECK INVENTORY HISTORY
              ===================================== */

              const inventoryHistory =
                database
                  .prepare(`
                    SELECT
                      COUNT(*) AS count

                    FROM inventory_transactions

                    WHERE product_id = ?
                  `)
                  .get(
                    productId,
                  );


              const saleCount =
                Number(
                  saleHistory
                    ?.count ??
                  0,
                );


              const purchaseCount =
                Number(
                  purchaseHistory
                    ?.count ??
                  0,
                );


              const inventoryTransactionCount =
                Number(
                  inventoryHistory
                    ?.count ??
                  0,
                );


              const hasHistory =
                saleCount > 0 ||
                purchaseCount > 0 ||
                inventoryTransactionCount > 0;


              /* =====================================
                 PRODUCT HAS HISTORY
                 -> DEACTIVATE INSTEAD
              ===================================== */

              if (hasHistory) {

                database
                  .prepare(`
                    UPDATE products

                    SET
                      is_active = 0,

                      updated_at =
                        CURRENT_TIMESTAMP,

                      sync_status =
                        'PENDING'

                    WHERE id = ?

                      AND store_id = ?
                  `)
                  .run(
                    productId,
                    STORE_ID,
                  );


                const product =
                  getProductById(
                    database,
                    productId,
                  );


                return {
                  action:
                    "DEACTIVATED",

                  deleted:
                    false,

                  deactivated:
                    true,

                  message:
                    "This product has transaction history, so it was deactivated instead of permanently deleted.",

                  history: {
                    sales:
                      saleCount,

                    purchases:
                      purchaseCount,

                    inventoryTransactions:
                      inventoryTransactionCount,
                  },

                  product,
                };
              }


              /* =====================================
                 NO HISTORY
                 REMOVE EMPTY INVENTORY BALANCE
              ===================================== */

              database
                .prepare(`
                  DELETE FROM inventory_balances

                  WHERE product_id = ?

                    AND register_id = ?
                `)
                .run(
                  productId,
                  REGISTER_ID,
                );


              /* =====================================
                 DELETE PRODUCT
              ===================================== */

              const result =
                database
                  .prepare(`
                    DELETE FROM products

                    WHERE id = ?

                      AND store_id = ?
                  `)
                  .run(
                    productId,
                    STORE_ID,
                  );


              if (
                result.changes === 0
              ) {
                throw new Error(
                  "Product was not found.",
                );
              }


              return {
                action:
                  "DELETED",

                deleted:
                  true,

                deactivated:
                  false,

                message:
                  "Product permanently deleted.",

                productId,

                productName:
                  existingProduct.name,
              };
            },
          );


        return deleteProduct();


      } catch (error) {

        if (
          error.message ===
          "Product was not found."
        ) {
          throw error;
        }


        throwFriendlyProductError(
          error,
          "delete",
        );
      }
    },
  );


  /* =========================================
     ADJUST INVENTORY
  ========================================= */

  ipcMain.handle(
    "inventory:adjust",
    (
      _event,
      adjustment,
    ) => {

      const database =
        getDatabase();


      const {
        productId,
        resultingQuantity,
        adjustmentType,
        reason,
        notes,
      } = adjustment ?? {};


      /* =====================================
         VALIDATE PRODUCT ID
      ===================================== */

      if (!productId) {
        throw new Error(
          "Product ID is required.",
        );
      }


      /* =====================================
         VALIDATE RESULTING QUANTITY
      ===================================== */

      const normalizedResultingQuantity =
        Number(
          resultingQuantity,
        );


      if (
        !Number.isFinite(
          normalizedResultingQuantity,
        ) ||
        normalizedResultingQuantity < 0
      ) {
        throw new Error(
          "Inventory quantity must be zero or greater.",
        );
      }


      /* =====================================
         GET PRODUCT + CURRENT QUANTITY
      ===================================== */

      const product =
        getProductById(
          database,
          productId,
        );


      if (!product) {
        throw new Error(
          "Product was not found.",
        );
      }


      if (
        !product.track_inventory
      ) {
        throw new Error(
          "Inventory tracking is not enabled for this product.",
        );
      }


      const previousQuantity =
        Number(
          product.inventory_quantity ??
          0,
        );


      /* =====================================
         CALCULATE ACTUAL QUANTITY CHANGE

         Important:
         Do not trust quantityChange from
         the renderer. Calculate it again
         from database values.
      ===================================== */

      const actualQuantityChange =
        normalizedResultingQuantity -
        previousQuantity;


      if (
        actualQuantityChange === 0
      ) {
        throw new Error(
          "The resulting quantity is the same as the current quantity.",
        );
      }


      /* =====================================
         NORMALIZE ADJUSTMENT INFORMATION
      ===================================== */

      const normalizedReason =
        String(
          reason ??
          "Stock Count Correction",
        ).trim() ||
        "Stock Count Correction";


      const normalizedNotes =
        normalizeOptionalText(
          notes,
        );


      const normalizedAdjustmentType =
        String(
          adjustmentType ??
          "",
        )
          .trim()
          .toUpperCase();


      /* =====================================
         INVENTORY ADJUSTMENT TRANSACTION

         Both:
         1. inventory balance update
         2. inventory history creation

         happen together.

         If either fails, SQLite rolls
         everything back.
      ===================================== */

      const adjustInventory =
        database.transaction(
          () => {

            /* =================================
               CHECK EXISTING BALANCE
            ================================= */

            const existingBalance =
              database
                .prepare(`
                  SELECT
                    product_id

                  FROM inventory_balances

                  WHERE product_id = ?

                    AND register_id = ?
                `)
                .get(
                  productId,
                  REGISTER_ID,
                );


            /* =================================
               UPDATE EXISTING BALANCE
            ================================= */

            if (
              existingBalance
            ) {

              database
                .prepare(`
                  UPDATE inventory_balances

                  SET
                    quantity = ?,

                    updated_at =
                      CURRENT_TIMESTAMP

                  WHERE product_id = ?

                    AND register_id = ?
                `)
                .run(
                  normalizedResultingQuantity,
                  productId,
                  REGISTER_ID,
                );

            } else {

              /* =================================
                 CREATE INVENTORY BALANCE
              ================================= */

              database
                .prepare(`
                  INSERT INTO inventory_balances (
                    product_id,
                    register_id,
                    quantity
                  )

                  VALUES (
                    ?,
                    ?,
                    ?
                  )
                `)
                .run(
                  productId,
                  REGISTER_ID,
                  normalizedResultingQuantity,
                );
            }


            /* =================================
               CREATE INVENTORY HISTORY RECORD
            ================================= */

            const inventoryTransactionId =
              randomUUID();


            let historyNotes =
              normalizedNotes;


            if (
              normalizedAdjustmentType
            ) {

              const adjustmentTypeText =
                `Adjustment type: ${normalizedAdjustmentType}`;


              historyNotes =
                normalizedNotes
                  ? `${adjustmentTypeText}. ${normalizedNotes}`
                  : adjustmentTypeText;
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

                  'ADJUSTMENT',

                  @quantityChange,

                  @previousQuantity,

                  @resultingQuantity,

                  @referenceId,

                  @reason,

                  @notes
                )
              `)
              .run({
                id:
                  inventoryTransactionId,

                productId,

                registerId:
                  REGISTER_ID,

                quantityChange:
                  actualQuantityChange,

                previousQuantity,

                resultingQuantity:
                  normalizedResultingQuantity,

                referenceId:
                  inventoryTransactionId,

                reason:
                  normalizedReason,

                notes:
                  historyNotes,
              });


            /* =================================
               RETURN UPDATED PRODUCT
            ================================= */

            return getProductById(
              database,
              productId,
            );
          },
        );


      return adjustInventory();
    },
  );
}