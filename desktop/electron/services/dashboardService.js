import {
  getDatabase,
} from "../database/database.js";


/* ==========================================
   HELPERS
========================================== */

function startOfTodaySql() {
  return `
    datetime(
      'now',
      'localtime',
      'start of day'
    )
  `;
}


/* ==========================================
   DASHBOARD SUMMARY
========================================== */

export function getDashboardSummary() {
  const database =
    getDatabase();


  /* ========================================
     TODAY'S SALES
  ======================================== */

  const todaySales =
    database
      .prepare(`
        SELECT
          COALESCE(
            SUM(total_cents),
            0
          ) AS total_sales_cents,

          COUNT(*) AS transaction_count

        FROM sales

        WHERE
          status = 'COMPLETED'

          AND datetime(
            completed_at
          ) >= ${startOfTodaySql()}
      `)
      .get();


  /* ========================================
     LOW STOCK
  ======================================== */

  const lowStock =
    database
      .prepare(`
        SELECT
          COUNT(*) AS count

        FROM (
          SELECT
            p.id,

            COALESCE(
              SUM(
                ib.quantity
              ),
              0
            ) AS quantity

          FROM products p

          LEFT JOIN inventory_balances ib
            ON ib.product_id = p.id

          WHERE
            p.is_active = 1

            AND p.track_inventory = 1

          GROUP BY
            p.id

          HAVING
            quantity <= 5
        )
      `)
      .get();


  /* ========================================
     INVENTORY VALUE
  ======================================== */

  const inventoryValue =
    database
      .prepare(`
        SELECT
          COALESCE(
            SUM(
              stock.quantity *
              stock.cost_price_cents
            ),
            0
          ) AS inventory_value_cents

        FROM (
          SELECT
            p.id,

            p.cost_price_cents,

            COALESCE(
              SUM(
                ib.quantity
              ),
              0
            ) AS quantity

          FROM products p

          LEFT JOIN inventory_balances ib
            ON ib.product_id = p.id

          WHERE
            p.is_active = 1

            AND p.track_inventory = 1

          GROUP BY
            p.id,
            p.cost_price_cents
        ) stock
      `)
      .get();


  return {
    todaySalesCents:
      Number(
        todaySales
          ?.total_sales_cents ??
          0,
      ),

    transactionCount:
      Number(
        todaySales
          ?.transaction_count ??
          0,
      ),

    lowStockCount:
      Number(
        lowStock
          ?.count ??
          0,
      ),

    inventoryValueCents:
      Math.round(
        Number(
          inventoryValue
            ?.inventory_value_cents ??
            0,
        ),
      ),
  };
}


/* ==========================================
   RECENT SALES
========================================== */

export function getRecentSales(
  limit = 5,
) {
  const database =
    getDatabase();


  const safeLimit =
    Math.min(
      Math.max(
        Number(limit) || 5,
        1,
      ),
      20,
    );


  return database
    .prepare(`
      SELECT
        id,
        sale_number,
        total_cents,
        payment_method,
        status,
        completed_at,
        created_at

      FROM sales

      WHERE
        status = 'COMPLETED'

      ORDER BY
        datetime(
          completed_at
        ) DESC

      LIMIT ?
    `)
    .all(
      safeLimit,
    );
}


/* ==========================================
   INVENTORY ALERTS
========================================== */

export function getInventoryAlerts(
  limit = 5,
) {
  const database =
    getDatabase();


  const safeLimit =
    Math.min(
      Math.max(
        Number(limit) || 5,
        1,
      ),
      20,
    );


  return database
    .prepare(`
      SELECT
        p.id,
        p.name,
        p.sku,

        COALESCE(
          SUM(
            ib.quantity
          ),
          0
        ) AS inventory_quantity

      FROM products p

      LEFT JOIN inventory_balances ib
        ON ib.product_id = p.id

      WHERE
        p.is_active = 1

        AND p.track_inventory = 1

      GROUP BY
        p.id,
        p.name,
        p.sku

      HAVING
        inventory_quantity <= 5

      ORDER BY
        inventory_quantity ASC,
        p.name ASC

      LIMIT ?
    `)
    .all(
      safeLimit,
    );
}


/* ==========================================
   COMPLETE DASHBOARD DATA
========================================== */

export function getDashboardData() {
  return {
    summary:
      getDashboardSummary(),

    recentSales:
      getRecentSales(5),

    inventoryAlerts:
      getInventoryAlerts(1000),
  };
}