import {
  getDatabase,
} from "../database/database.js";


/* ===========================================
   STORE
=========================================== */

const STORE_ID =
  "store-001";

const REGISTER_ID =
  "register-001";


/* ===========================================
   HELPERS
=========================================== */

function normalizeDate(
  value,
) {
  const text =
    String(
      value ?? "",
    ).trim();

  if (!text) {
    return null;
  }


  const datePattern =
    /^\d{4}-\d{2}-\d{2}$/;


  if (
    !datePattern.test(
      text,
    )
  ) {
    throw new Error(
      "Report dates must use YYYY-MM-DD format.",
    );
  }


  return text;
}


function normalizeLimit(
  value,
) {
  const number =
    Number(
      value ?? 500,
    );


  if (
    !Number.isFinite(
      number,
    )
  ) {
    return 500;
  }


  return Math.min(
    Math.max(
      Math.trunc(
        number,
      ),
      1,
    ),
    2000,
  );
}


function numberValue(
  value,
) {
  const number =
    Number(
      value ?? 0,
    );

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
}


/* ===========================================
   DATE FILTER
=========================================== */

function buildDateFilter({
  column,
  startDate,
  endDate,
}) {
  const conditions = [];

  const parameters = {};


  if (startDate) {
    conditions.push(`
      date(
        ${column},
        'localtime'
      ) >= date(
        @startDate
      )
    `);

    parameters.startDate =
      startDate;
  }


  if (endDate) {
    conditions.push(`
      date(
        ${column},
        'localtime'
      ) <= date(
        @endDate
      )
    `);

    parameters.endDate =
      endDate;
  }


  return {
    sql:
      conditions.length > 0
        ? conditions.join(
            "\nAND ",
          )
        : "1 = 1",

    parameters,
  };
}


/* ===========================================
   SALES SUMMARY
=========================================== */

function getSalesSummary({
  database,
  startDate,
  endDate,
}) {
  const dateFilter =
    buildDateFilter({
      column:
        "sales.completed_at",

      startDate,

      endDate,
    });


  const row =
    database
      .prepare(`
        SELECT
          COUNT(*) AS sale_count,

          COALESCE(
            SUM(
              sales.subtotal_cents
            ),
            0
          ) AS subtotal_cents,

          COALESCE(
            SUM(
              sales.discount_cents
            ),
            0
          ) AS discount_cents,

          COALESCE(
            SUM(
              sales.tax_cents
            ),
            0
          ) AS tax_cents,

          COALESCE(
            SUM(
              sales.total_cents
            ),
            0
          ) AS total_sales_cents

        FROM sales

        WHERE sales.store_id =
          @storeId

          AND sales.register_id =
            @registerId

          AND sales.status =
            'COMPLETED'

          AND ${dateFilter.sql}
      `)
      .get({
        storeId:
          STORE_ID,

        registerId:
          REGISTER_ID,

        ...dateFilter.parameters,
      });


  return {
    saleCount:
      numberValue(
        row?.sale_count,
      ),

    subtotalCents:
      numberValue(
        row?.subtotal_cents,
      ),

    discountCents:
      numberValue(
        row?.discount_cents,
      ),

    taxCents:
      numberValue(
        row?.tax_cents,
      ),

    totalSalesCents:
      numberValue(
        row?.total_sales_cents,
      ),
  };
}


/* ===========================================
   COST OF GOODS SOLD
=========================================== */

function getCogsSummary({
  database,
  startDate,
  endDate,
}) {
  const dateFilter =
    buildDateFilter({
      column:
        "sales.completed_at",

      startDate,

      endDate,
    });


  const row =
    database
      .prepare(`
        SELECT
          COALESCE(
            SUM(
              ROUND(
                sale_items.quantity *
                sale_items.unit_cost_cents
              )
            ),
            0
          ) AS cogs_cents

        FROM sale_items

        INNER JOIN sales
          ON sales.id =
            sale_items.sale_id

        WHERE sales.store_id =
          @storeId

          AND sales.register_id =
            @registerId

          AND sales.status =
            'COMPLETED'

          AND ${dateFilter.sql}
      `)
      .get({
        storeId:
          STORE_ID,

        registerId:
          REGISTER_ID,

        ...dateFilter.parameters,
      });


  return {
    cogsCents:
      numberValue(
        row?.cogs_cents,
      ),
  };
}


/* ===========================================
   OPERATING EXPENSES
=========================================== */

function getExpenseSummary({
  database,
  startDate,
  endDate,
}) {
  const dateFilter =
    buildDateFilter({
      column:
        "expenses.expense_at",

      startDate,

      endDate,
    });


  const row =
    database
      .prepare(`
        SELECT
          COUNT(*) AS expense_count,

          COALESCE(
            SUM(
              expenses.amount_cents
            ),
            0
          ) AS total_expenses_cents,

          COALESCE(
            SUM(
              CASE
                WHEN expenses.payment_method =
                  'CASH'
                THEN expenses.amount_cents
                ELSE 0
              END
            ),
            0
          ) AS cash_expenses_cents,

          COALESCE(
            SUM(
              CASE
                WHEN expenses.payment_method =
                  'MPESA'
                THEN expenses.amount_cents
                ELSE 0
              END
            ),
            0
          ) AS mpesa_expenses_cents,

          COALESCE(
            SUM(
              CASE
                WHEN expenses.payment_method =
                  'BANK'
                THEN expenses.amount_cents
                ELSE 0
              END
            ),
            0
          ) AS bank_expenses_cents,

          COALESCE(
            SUM(
              CASE
                WHEN expenses.payment_method =
                  'OTHER'
                THEN expenses.amount_cents
                ELSE 0
              END
            ),
            0
          ) AS other_expenses_cents

        FROM expenses

        WHERE expenses.store_id =
          @storeId

          AND expenses.register_id =
            @registerId

          AND expenses.status =
            'ACTIVE'

          AND ${dateFilter.sql}
      `)
      .get({
        storeId:
          STORE_ID,

        registerId:
          REGISTER_ID,

        ...dateFilter.parameters,
      });


  return {
    expenseCount:
      numberValue(
        row?.expense_count,
      ),

    totalExpensesCents:
      numberValue(
        row?.total_expenses_cents,
      ),

    cashExpensesCents:
      numberValue(
        row?.cash_expenses_cents,
      ),

    mpesaExpensesCents:
      numberValue(
        row?.mpesa_expenses_cents,
      ),

    bankExpensesCents:
      numberValue(
        row?.bank_expenses_cents,
      ),

    otherExpensesCents:
      numberValue(
        row?.other_expenses_cents,
      ),
  };
}


/* ===========================================
   PURCHASE SUMMARY
=========================================== */

function getPurchaseSummary({
  database,
  startDate,
  endDate,
}) {
  const dateFilter =
    buildDateFilter({
      column:
        "purchases.purchased_at",

      startDate,

      endDate,
    });


  const row =
    database
      .prepare(`
        SELECT
          COUNT(*) AS purchase_count,

          COALESCE(
            SUM(
              purchases.subtotal_cents
            ),
            0
          ) AS purchase_subtotal_cents,

          COALESCE(
            SUM(
              purchases.discount_cents
            ),
            0
          ) AS purchase_discount_cents,

          COALESCE(
            SUM(
              purchases.total_cents
            ),
            0
          ) AS total_purchases_cents,

          COALESCE(
            SUM(
              CASE
                WHEN purchases.payment_method =
                  'CASH'
                THEN purchases.total_cents
                ELSE 0
              END
            ),
            0
          ) AS cash_purchases_cents,

          COALESCE(
            SUM(
              CASE
                WHEN purchases.payment_method =
                  'MPESA'
                THEN purchases.total_cents
                ELSE 0
              END
            ),
            0
          ) AS mpesa_purchases_cents,

          COALESCE(
            SUM(
              CASE
                WHEN purchases.payment_method =
                  'BANK'
                THEN purchases.total_cents
                ELSE 0
              END
            ),
            0
          ) AS bank_purchases_cents,

          COALESCE(
            SUM(
              CASE
                WHEN purchases.payment_method =
                  'CREDIT'
                THEN purchases.total_cents
                ELSE 0
              END
            ),
            0
          ) AS credit_purchases_cents,

          COALESCE(
            SUM(
              CASE
                WHEN purchases.payment_method =
                  'OTHER'
                THEN purchases.total_cents
                ELSE 0
              END
            ),
            0
          ) AS other_purchases_cents

        FROM purchases

        WHERE purchases.store_id =
          @storeId

          AND purchases.register_id =
            @registerId

          AND purchases.status =
            'COMPLETED'

          AND ${dateFilter.sql}
      `)
      .get({
        storeId:
          STORE_ID,

        registerId:
          REGISTER_ID,

        ...dateFilter.parameters,
      });


  return {
    purchaseCount:
      numberValue(
        row?.purchase_count,
      ),

    purchaseSubtotalCents:
      numberValue(
        row?.purchase_subtotal_cents,
      ),

    purchaseDiscountCents:
      numberValue(
        row?.purchase_discount_cents,
      ),

    totalPurchasesCents:
      numberValue(
        row?.total_purchases_cents,
      ),

    cashPurchasesCents:
      numberValue(
        row?.cash_purchases_cents,
      ),

    mpesaPurchasesCents:
      numberValue(
        row?.mpesa_purchases_cents,
      ),

    bankPurchasesCents:
      numberValue(
        row?.bank_purchases_cents,
      ),

    creditPurchasesCents:
      numberValue(
        row?.credit_purchases_cents,
      ),

    otherPurchasesCents:
      numberValue(
        row?.other_purchases_cents,
      ),
  };
}


/* ===========================================
   PAYMENT SUMMARY

   Use payment rows instead of only
   sales.payment_method so SPLIT sales are
   reported correctly.
=========================================== */

function getPaymentSummary({
  database,
  startDate,
  endDate,
}) {
  const dateFilter =
    buildDateFilter({
      column:
        "sales.completed_at",

      startDate,

      endDate,
    });


  const rows =
    database
      .prepare(`
        SELECT
          payments.payment_method,
          COALESCE(
            SUM(
              payments.amount_cents
            ),
            0
          ) AS amount_cents

        FROM payments

        INNER JOIN sales
          ON sales.id =
            payments.sale_id

        WHERE sales.store_id =
          @storeId

          AND sales.register_id =
            @registerId

          AND sales.status =
            'COMPLETED'

          AND ${dateFilter.sql}

        GROUP BY
          payments.payment_method
      `)
      .all({
        storeId:
          STORE_ID,

        registerId:
          REGISTER_ID,

        ...dateFilter.parameters,
      });


  const result = {
    cashSalesCents: 0,

    mpesaSalesCents: 0,

    cardSalesCents: 0,

    otherSalesCents: 0,
  };


  rows.forEach(
    (row) => {
      const amount =
        numberValue(
          row.amount_cents,
        );


      switch (
        row.payment_method
      ) {
        case "CASH":
          result.cashSalesCents +=
            amount;

          break;


        /*
         * Current payments schema uses
         * MOBILE_MONEY.
         *
         * We also accept MPESA here so
         * this service remains compatible
         * with records written using the
         * POS terminology.
         */

        case "MOBILE_MONEY":
        case "MPESA":
          result.mpesaSalesCents +=
            amount;

          break;


        case "CARD":
          result.cardSalesCents +=
            amount;

          break;


        default:
          result.otherSalesCents +=
            amount;

          break;
      }
    },
  );


  result.totalPaymentsCents =
    result.cashSalesCents +
    result.mpesaSalesCents +
    result.cardSalesCents +
    result.otherSalesCents;


  return result;
}


/* ===========================================
   SALES FALLBACK PAYMENT SUMMARY

   Some older records may have a sale but no
   row inside payments.

   This lets us detect that situation.
=========================================== */

function getSalePaymentFallback({
  database,
  startDate,
  endDate,
}) {
  const dateFilter =
    buildDateFilter({
      column:
        "sales.completed_at",

      startDate,

      endDate,
    });


  const row =
    database
      .prepare(`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN sales.payment_method =
                  'CASH'
                THEN sales.total_cents
                ELSE 0
              END
            ),
            0
          ) AS cash_sales_cents,

          COALESCE(
            SUM(
              CASE
                WHEN sales.payment_method =
                  'MPESA'
                THEN sales.total_cents
                ELSE 0
              END
            ),
            0
          ) AS mpesa_sales_cents

        FROM sales

        WHERE sales.store_id =
          @storeId

          AND sales.register_id =
            @registerId

          AND sales.status =
            'COMPLETED'

          AND ${dateFilter.sql}
      `)
      .get({
        storeId:
          STORE_ID,

        registerId:
          REGISTER_ID,

        ...dateFilter.parameters,
      });


  return {
    cashSalesCents:
      numberValue(
        row?.cash_sales_cents,
      ),

    mpesaSalesCents:
      numberValue(
        row?.mpesa_sales_cents,
      ),
  };
}


/* ===========================================
   DAILY TREND
=========================================== */

function getDailyTrend({
  database,
  startDate,
  endDate,
}) {
  const salesDateFilter =
    buildDateFilter({
      column:
        "sales.completed_at",

      startDate,

      endDate,
    });


  const expenseDateFilter =
    buildDateFilter({
      column:
        "expenses.expense_at",

      startDate,

      endDate,
    });


  const purchaseDateFilter =
    buildDateFilter({
      column:
        "purchases.purchased_at",

      startDate,

      endDate,
    });


  const salesRows =
    database
      .prepare(`
        SELECT
          date(
            sales.completed_at,
            'localtime'
          ) AS report_date,

          COALESCE(
            SUM(
              sales.total_cents
            ),
            0
          ) AS sales_cents,

          COALESCE(
            SUM(
              (
                SELECT
                  COALESCE(
                    SUM(
                      ROUND(
                        sale_items.quantity *
                        sale_items.unit_cost_cents
                      )
                    ),
                    0
                  )

                FROM sale_items

                WHERE sale_items.sale_id =
                  sales.id
              )
            ),
            0
          ) AS cogs_cents

        FROM sales

        WHERE sales.store_id =
          @storeId

          AND sales.register_id =
            @registerId

          AND sales.status =
            'COMPLETED'

          AND ${salesDateFilter.sql}

        GROUP BY
          report_date

        ORDER BY
          report_date ASC
      `)
      .all({
        storeId:
          STORE_ID,

        registerId:
          REGISTER_ID,

        ...salesDateFilter.parameters,
      });


  const expenseRows =
    database
      .prepare(`
        SELECT
          date(
            expenses.expense_at,
            'localtime'
          ) AS report_date,

          COALESCE(
            SUM(
              expenses.amount_cents
            ),
            0
          ) AS expenses_cents

        FROM expenses

        WHERE expenses.store_id =
          @storeId

          AND expenses.register_id =
            @registerId

          AND expenses.status =
            'ACTIVE'

          AND ${expenseDateFilter.sql}

        GROUP BY
          report_date
      `)
      .all({
        storeId:
          STORE_ID,

        registerId:
          REGISTER_ID,

        ...expenseDateFilter.parameters,
      });


  const purchaseRows =
    database
      .prepare(`
        SELECT
          date(
            purchases.purchased_at,
            'localtime'
          ) AS report_date,

          COALESCE(
            SUM(
              purchases.total_cents
            ),
            0
          ) AS purchases_cents

        FROM purchases

        WHERE purchases.store_id =
          @storeId

          AND purchases.register_id =
            @registerId

          AND purchases.status =
            'COMPLETED'

          AND ${purchaseDateFilter.sql}

        GROUP BY
          report_date
      `)
      .all({
        storeId:
          STORE_ID,

        registerId:
          REGISTER_ID,

        ...purchaseDateFilter.parameters,
      });


  const byDate =
    new Map();


  function ensureDate(
    date,
  ) {
    if (
      !byDate.has(
        date,
      )
    ) {
      byDate.set(
        date,
        {
          date,

          salesCents: 0,

          cogsCents: 0,

          grossProfitCents: 0,

          expensesCents: 0,

          netProfitCents: 0,

          purchasesCents: 0,
        },
      );
    }


    return byDate.get(
      date,
    );
  }


  salesRows.forEach(
    (row) => {
      const item =
        ensureDate(
          row.report_date,
        );


      item.salesCents =
        numberValue(
          row.sales_cents,
        );


      item.cogsCents =
        numberValue(
          row.cogs_cents,
        );
    },
  );


  expenseRows.forEach(
    (row) => {
      const item =
        ensureDate(
          row.report_date,
        );


      item.expensesCents =
        numberValue(
          row.expenses_cents,
        );
    },
  );


  purchaseRows.forEach(
    (row) => {
      const item =
        ensureDate(
          row.report_date,
        );


      item.purchasesCents =
        numberValue(
          row.purchases_cents,
        );
    },
  );


  return Array.from(
    byDate.values(),
  )
    .map(
      (item) => ({
        ...item,

        grossProfitCents:
          item.salesCents -
          item.cogsCents,

        netProfitCents:
          item.salesCents -
          item.cogsCents -
          item.expensesCents,
      }),
    )
    .sort(
      (a, b) =>
        String(
          a.date,
        ).localeCompare(
          String(
            b.date,
          ),
        ),
    );
}


/* ===========================================
   FINANCIAL ACTIVITY TABLE
=========================================== */

function getFinancialActivity({
  database,
  startDate,
  endDate,
  limit,
}) {
  const salesDateFilter =
    buildDateFilter({
      column:
        "sales.completed_at",

      startDate,

      endDate,
    });


  const expenseDateFilter =
    buildDateFilter({
      column:
        "expenses.expense_at",

      startDate,

      endDate,
    });


  const purchaseDateFilter =
    buildDateFilter({
      column:
        "purchases.purchased_at",

      startDate,

      endDate,
    });


  const rows =
    database
      .prepare(`
        SELECT *
        FROM (
          /* =====================================
             SALES
          ===================================== */

          SELECT
            sales.completed_at
              AS transaction_date,

            'SALE'
              AS transaction_type,

            sales.id
              AS id,

            sales.sale_number
              AS reference,

            'Sale completed'
              AS description,

            sales.payment_method
              AS payment_method,

            sales.total_cents
              AS sales_cents,

            COALESCE(
              (
                SELECT
                  SUM(
                    ROUND(
                      sale_items.quantity *
                      sale_items.unit_cost_cents
                    )
                  )

                FROM sale_items

                WHERE sale_items.sale_id =
                  sales.id
              ),
              0
            )
              AS cogs_cents,

            0
              AS expense_cents,

            0
              AS purchase_cents

          FROM sales

          WHERE sales.store_id =
            @storeId

            AND sales.register_id =
              @registerId

            AND sales.status =
              'COMPLETED'

            AND ${salesDateFilter.sql}


          UNION ALL


          /* =====================================
             EXPENSES
          ===================================== */

          SELECT
            expenses.expense_at
              AS transaction_date,

            'EXPENSE'
              AS transaction_type,

            expenses.id
              AS id,

            COALESCE(
              expenses.reference_number,
              expenses.id
            )
              AS reference,

            expenses.description
              AS description,

            expenses.payment_method
              AS payment_method,

            0
              AS sales_cents,

            0
              AS cogs_cents,

            expenses.amount_cents
              AS expense_cents,

            0
              AS purchase_cents

          FROM expenses

          WHERE expenses.store_id =
            @storeId

            AND expenses.register_id =
              @registerId

            AND expenses.status =
              'ACTIVE'

            AND ${expenseDateFilter.sql}


          UNION ALL


          /* =====================================
             PURCHASES
          ===================================== */

          SELECT
            purchases.purchased_at
              AS transaction_date,

            'PURCHASE'
              AS transaction_type,

            purchases.id
              AS id,

            purchases.purchase_number
              AS reference,

            CASE
              WHEN purchases.supplier_name
                IS NOT NULL

                AND trim(
                  purchases.supplier_name
                ) <> ''

              THEN
                'Stock purchase from ' ||
                purchases.supplier_name

              ELSE
                'Stock purchase'
            END
              AS description,

            purchases.payment_method
              AS payment_method,

            0
              AS sales_cents,

            0
              AS cogs_cents,

            0
              AS expense_cents,

            purchases.total_cents
              AS purchase_cents

          FROM purchases

          WHERE purchases.store_id =
            @storeId

            AND purchases.register_id =
              @registerId

            AND purchases.status =
              'COMPLETED'

            AND ${purchaseDateFilter.sql}
        )

        ORDER BY
          transaction_date DESC

        LIMIT @limit
      `)
      .all({
        storeId:
          STORE_ID,

        registerId:
          REGISTER_ID,

        startDate:
          startDate ?? null,

        endDate:
          endDate ?? null,

        limit,
      });


  return rows.map(
    (row) => {
      const salesCents =
        numberValue(
          row.sales_cents,
        );

      const cogsCents =
        numberValue(
          row.cogs_cents,
        );

      const expenseCents =
        numberValue(
          row.expense_cents,
        );

      const purchaseCents =
        numberValue(
          row.purchase_cents,
        );


      /*
       * Purchases are deliberately NOT
       * subtracted from profit.
       *
       * Stock becomes COGS when sold.
       */

      const profitCents =
        salesCents -
        cogsCents -
        expenseCents;


      return {
        id:
          row.id,

        date:
          row.transaction_date,

        type:
          row.transaction_type,

        reference:
          row.reference,

        description:
          row.description,

        paymentMethod:
          row.payment_method,

        salesCents,

        cogsCents,

        expenseCents,

        purchaseCents,

        profitCents,
      };
    },
  );
}


/* ===========================================
   MAIN FINANCIAL REPORT
=========================================== */

export function getFinancialReport(
  filters = {},
) {
  const database =
    getDatabase();


  const startDate =
    normalizeDate(
      filters.startDate,
    );


  const endDate =
    normalizeDate(
      filters.endDate,
    );


  if (
    startDate &&
    endDate &&
    startDate > endDate
  ) {
    throw new Error(
      "Start date cannot be after end date.",
    );
  }


  const limit =
    normalizeLimit(
      filters.limit,
    );


  /* =========================================
     SOURCE SUMMARIES
  ========================================= */

  const sales =
    getSalesSummary({
      database,
      startDate,
      endDate,
    });


  const cogs =
    getCogsSummary({
      database,
      startDate,
      endDate,
    });


  const expenses =
    getExpenseSummary({
      database,
      startDate,
      endDate,
    });


  const purchases =
    getPurchaseSummary({
      database,
      startDate,
      endDate,
    });


  let payments =
    getPaymentSummary({
      database,
      startDate,
      endDate,
    });


  /*
   * If no payment rows exist for an older
   * data set, fall back to the payment
   * method stored directly on sales.
   */

  if (
    payments.totalPaymentsCents ===
      0 &&
    sales.totalSalesCents >
      0
  ) {
    const fallback =
      getSalePaymentFallback({
        database,
        startDate,
        endDate,
      });


    payments = {
      ...payments,

      cashSalesCents:
        fallback.cashSalesCents,

      mpesaSalesCents:
        fallback.mpesaSalesCents,

      totalPaymentsCents:
        fallback.cashSalesCents +
        fallback.mpesaSalesCents,
    };
  }


  /* =========================================
     PROFIT
  ========================================= */

  const grossProfitCents =
    sales.totalSalesCents -
    cogs.cogsCents;


  const netProfitCents =
    grossProfitCents -
    expenses.totalExpensesCents;


  /* =========================================
     CASH MOVEMENT

     Opening cash will be added once we wire
     the register-session source.

     For now this provides the operational
     movement created by the selected report
     period.
  ========================================= */

  const netCashMovementCents =
    payments.cashSalesCents -
    expenses.cashExpensesCents -
    purchases.cashPurchasesCents;


  /* =========================================
     TREND + TABLE
  ========================================= */

  const dailyTrend =
    getDailyTrend({
      database,
      startDate,
      endDate,
    });


  const activity =
    getFinancialActivity({
      database,
      startDate,
      endDate,
      limit,
    });


  /* =========================================
     RETURN
  ========================================= */

  return {
    period: {
      startDate,
      endDate,
    },


    summary: {
      salesCents:
        sales.totalSalesCents,

      cogsCents:
        cogs.cogsCents,

      grossProfitCents,

      operatingExpensesCents:
        expenses.totalExpensesCents,

      netProfitCents,

      purchasesCents:
        purchases.totalPurchasesCents,

      saleCount:
        sales.saleCount,

      expenseCount:
        expenses.expenseCount,

      purchaseCount:
        purchases.purchaseCount,
    },


    sales: {
      subtotalCents:
        sales.subtotalCents,

      discountCents:
        sales.discountCents,

      taxCents:
        sales.taxCents,

      totalSalesCents:
        sales.totalSalesCents,
    },


    cogs: {
      totalCogsCents:
        cogs.cogsCents,
    },


    expenses: {
      totalExpensesCents:
        expenses.totalExpensesCents,

      cashExpensesCents:
        expenses.cashExpensesCents,

      mpesaExpensesCents:
        expenses.mpesaExpensesCents,

      bankExpensesCents:
        expenses.bankExpensesCents,

      otherExpensesCents:
        expenses.otherExpensesCents,
    },


    purchases: {
      subtotalCents:
        purchases.purchaseSubtotalCents,

      discountCents:
        purchases.purchaseDiscountCents,

      totalPurchasesCents:
        purchases.totalPurchasesCents,

      cashPurchasesCents:
        purchases.cashPurchasesCents,

      mpesaPurchasesCents:
        purchases.mpesaPurchasesCents,

      bankPurchasesCents:
        purchases.bankPurchasesCents,

      creditPurchasesCents:
        purchases.creditPurchasesCents,

      otherPurchasesCents:
        purchases.otherPurchasesCents,
    },


    payments: {
      cashSalesCents:
        payments.cashSalesCents,

      mpesaSalesCents:
        payments.mpesaSalesCents,

      cardSalesCents:
        payments.cardSalesCents,

      otherSalesCents:
        payments.otherSalesCents,

      totalPaymentsCents:
        payments.totalPaymentsCents,
    },


    cashPosition: {
      /*
       * We will connect true opening cash
       * when we add/read the register-session
       * source.
       */

      openingCashCents:
        null,

      cashSalesCents:
        payments.cashSalesCents,

      cashExpensesCents:
        expenses.cashExpensesCents,

      cashPurchasesCents:
        purchases.cashPurchasesCents,

      netCashMovementCents,

      expectedCashCents:
        null,
    },


    dailyTrend,

    activity,
  };
}