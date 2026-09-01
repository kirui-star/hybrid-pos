import {
  randomUUID,
} from "node:crypto";

import {
  getDatabase,
} from "../database/database.js";


const STORE_ID =
  "store-001";

const REGISTER_ID =
  "register-001";


/* =========================================
   EXPENSE CATEGORIES
========================================= */

const VALID_CATEGORIES = [
  "RENT",
  "UTILITIES",
  "TRANSPORT",
  "SUPPLIES",
  "REPAIRS",
  "WAGES",
  "FOOD",
  "INTERNET",
  "OTHER",
];


/* =========================================
   PAYMENT METHODS
========================================= */

const VALID_PAYMENT_METHODS = [
  "CASH",
  "MPESA",
  "BANK",
  "OTHER",
];


/* =========================================
   NORMALIZE TEXT
========================================= */

function normalizeText(
  value,
) {
  const normalized =
    String(
      value ?? "",
    ).trim();

  return normalized ||
    null;
}


/* =========================================
   VALIDATE AMOUNT
========================================= */

function validateAmount(
  amountCents,
) {
  if (
    !Number.isInteger(
      amountCents,
    ) ||
    amountCents <= 0
  ) {
    throw new Error(
      "Expense amount must be greater than zero.",
    );
  }
}


/* =========================================
   VALIDATE CATEGORY
========================================= */

function validateCategory(
  category,
) {
  if (
    !VALID_CATEGORIES.includes(
      category,
    )
  ) {
    throw new Error(
      "A valid expense category is required.",
    );
  }
}


/* =========================================
   VALIDATE PAYMENT METHOD
========================================= */

function validatePaymentMethod(
  paymentMethod,
) {
  if (
    !VALID_PAYMENT_METHODS.includes(
      paymentMethod,
    )
  ) {
    throw new Error(
      "A valid expense payment method is required.",
    );
  }
}


/* =========================================
   MAP EXPENSE
========================================= */

function mapExpense(
  row,
) {
  if (!row) {
    return null;
  }

  return {
    id:
      row.id,

    storeId:
      row.store_id,

    registerId:
      row.register_id,

    category:
      row.category,

    description:
      row.description,

    amountCents:
      Number(
        row.amount_cents,
      ),

    paymentMethod:
      row.payment_method,

    referenceNumber:
      row.reference_number,

    notes:
      row.notes,

    status:
      row.status,

    expenseAt:
      row.expense_at,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}


/* =========================================
   CREATE EXPENSE
========================================= */

function createExpense(
  expense,
) {
  if (!expense) {
    throw new Error(
      "Expense data is required.",
    );
  }


  const category =
    String(
      expense.category ?? "",
    )
      .trim()
      .toUpperCase();


  const description =
    String(
      expense.description ?? "",
    ).trim();


  const amountCents =
    Number(
      expense.amountCents,
    );


  const paymentMethod =
    String(
      expense.paymentMethod ??
        "",
    )
      .trim()
      .toUpperCase();


  if (!description) {
    throw new Error(
      "Expense description is required.",
    );
  }


  validateCategory(
    category,
  );


  validateAmount(
    amountCents,
  );


  validatePaymentMethod(
    paymentMethod,
  );


  const database =
    getDatabase();


  const expenseId =
    randomUUID();


  database
    .prepare(`
      INSERT INTO expenses (
        id,

        store_id,

        register_id,

        category,

        description,

        amount_cents,

        payment_method,

        reference_number,

        notes,

        status,

        expense_at
      )
      VALUES (
        @id,

        @storeId,

        @registerId,

        @category,

        @description,

        @amountCents,

        @paymentMethod,

        @referenceNumber,

        @notes,

        'ACTIVE',

        COALESCE(
          @expenseAt,
          CURRENT_TIMESTAMP
        )
      )
    `)
    .run({
      id:
        expenseId,

      storeId:
        STORE_ID,

      registerId:
        REGISTER_ID,

      category,

      description,

      amountCents,

      paymentMethod,

      referenceNumber:
        normalizeText(
          expense.referenceNumber,
        ),

      notes:
        normalizeText(
          expense.notes,
        ),

      expenseAt:
        normalizeText(
          expense.expenseAt,
        ),
    });


  const createdExpense =
    database
      .prepare(`
        SELECT *
        FROM expenses

        WHERE id = ?

        LIMIT 1
      `)
      .get(
        expenseId,
      );


  return mapExpense(
    createdExpense,
  );
}


/* =========================================
   GET ALL EXPENSES
========================================= */

function getAllExpenses(
  limit = 200,
) {
  const database =
    getDatabase();


  const safeLimit =
    Math.min(
      Math.max(
        Number(limit) || 200,
        1,
      ),
      1000,
    );


  const rows =
    database
      .prepare(`
        SELECT *
        FROM expenses

        WHERE store_id = ?

        ORDER BY
          expense_at DESC,
          created_at DESC

        LIMIT ?
      `)
      .all(
        STORE_ID,
        safeLimit,
      );


  return rows.map(
    mapExpense,
  );
}


/* =========================================
   GET TODAY EXPENSES
========================================= */

function getTodayExpenses() {
  const database =
    getDatabase();


  const rows =
    database
      .prepare(`
        SELECT *
        FROM expenses

        WHERE store_id = ?

          AND date(
            expense_at,
            'localtime'
          ) =
          date(
            'now',
            'localtime'
          )

        ORDER BY
          expense_at DESC,
          created_at DESC
      `)
      .all(
        STORE_ID,
      );


  return rows.map(
    mapExpense,
  );
}


/* =========================================
   GET EXPENSES BY DATE RANGE
========================================= */

function getExpensesByDateRange(
  startDate,
  endDate,
) {
  if (
    !startDate ||
    !endDate
  ) {
    throw new Error(
      "Start date and end date are required.",
    );
  }


  const database =
    getDatabase();


  const rows =
    database
      .prepare(`
        SELECT *
        FROM expenses

        WHERE store_id = ?

          AND date(
            expense_at,
            'localtime'
          ) >= date(?)

          AND date(
            expense_at,
            'localtime'
          ) <= date(?)

        ORDER BY
          expense_at DESC,
          created_at DESC
      `)
      .all(
        STORE_ID,
        startDate,
        endDate,
      );


  return rows.map(
    mapExpense,
  );
}


/* =========================================
   GET EXPENSE SUMMARY
========================================= */

function getExpenseSummary(
  startDate = null,
  endDate = null,
) {
  const database =
    getDatabase();


  let whereClause = `
    WHERE store_id = @storeId
      AND status = 'ACTIVE'
  `;


  const parameters = {
    storeId:
      STORE_ID,
  };


  if (
    startDate &&
    endDate
  ) {
    whereClause += `

      AND date(
        expense_at,
        'localtime'
      ) >= date(
        @startDate
      )

      AND date(
        expense_at,
        'localtime'
      ) <= date(
        @endDate
      )
    `;


    parameters.startDate =
      startDate;

    parameters.endDate =
      endDate;
  }


  const summary =
    database
      .prepare(`
        SELECT

          COALESCE(
            SUM(
              amount_cents
            ),
            0
          ) AS total_expenses_cents,

          COALESCE(
            SUM(
              CASE
                WHEN payment_method = 'CASH'
                THEN amount_cents
                ELSE 0
              END
            ),
            0
          ) AS cash_expenses_cents,

          COALESCE(
            SUM(
              CASE
                WHEN payment_method = 'MPESA'
                THEN amount_cents
                ELSE 0
              END
            ),
            0
          ) AS mpesa_expenses_cents,

          COALESCE(
            SUM(
              CASE
                WHEN payment_method = 'BANK'
                THEN amount_cents
                ELSE 0
              END
            ),
            0
          ) AS bank_expenses_cents,

          COALESCE(
            SUM(
              CASE
                WHEN payment_method = 'OTHER'
                THEN amount_cents
                ELSE 0
              END
            ),
            0
          ) AS other_expenses_cents,

          COUNT(*) AS expense_count

        FROM expenses

        ${whereClause}
      `)
      .get(
        parameters,
      );


  return {
    totalExpensesCents:
      Number(
        summary
          ?.total_expenses_cents ??
        0,
      ),

    cashExpensesCents:
      Number(
        summary
          ?.cash_expenses_cents ??
        0,
      ),

    mpesaExpensesCents:
      Number(
        summary
          ?.mpesa_expenses_cents ??
        0,
      ),

    bankExpensesCents:
      Number(
        summary
          ?.bank_expenses_cents ??
        0,
      ),

    otherExpensesCents:
      Number(
        summary
          ?.other_expenses_cents ??
        0,
      ),

    expenseCount:
      Number(
        summary
          ?.expense_count ??
        0,
      ),
  };
}


/* =========================================
   TODAY SUMMARY
========================================= */

function getTodayExpenseSummary() {
  const database =
    getDatabase();


  const summary =
    database
      .prepare(`
        SELECT

          COALESCE(
            SUM(
              amount_cents
            ),
            0
          ) AS total_expenses_cents,

          COALESCE(
            SUM(
              CASE
                WHEN payment_method = 'CASH'
                THEN amount_cents
                ELSE 0
              END
            ),
            0
          ) AS cash_expenses_cents,

          COALESCE(
            SUM(
              CASE
                WHEN payment_method = 'MPESA'
                THEN amount_cents
                ELSE 0
              END
            ),
            0
          ) AS mpesa_expenses_cents,

          COALESCE(
            SUM(
              CASE
                WHEN payment_method = 'BANK'
                THEN amount_cents
                ELSE 0
              END
            ),
            0
          ) AS bank_expenses_cents,

          COALESCE(
            SUM(
              CASE
                WHEN payment_method = 'OTHER'
                THEN amount_cents
                ELSE 0
              END
            ),
            0
          ) AS other_expenses_cents,

          COUNT(*) AS expense_count

        FROM expenses

        WHERE store_id = ?

          AND status = 'ACTIVE'

          AND date(
            expense_at,
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
    totalExpensesCents:
      Number(
        summary
          ?.total_expenses_cents ??
        0,
      ),

    cashExpensesCents:
      Number(
        summary
          ?.cash_expenses_cents ??
        0,
      ),

    mpesaExpensesCents:
      Number(
        summary
          ?.mpesa_expenses_cents ??
        0,
      ),

    bankExpensesCents:
      Number(
        summary
          ?.bank_expenses_cents ??
        0,
      ),

    otherExpensesCents:
      Number(
        summary
          ?.other_expenses_cents ??
        0,
      ),

    expenseCount:
      Number(
        summary
          ?.expense_count ??
        0,
      ),
  };
}


/* =========================================
   VOID EXPENSE
========================================= */

function voidExpense(
  expenseId,
) {
  if (!expenseId) {
    throw new Error(
      "Expense ID is required.",
    );
  }


  const database =
    getDatabase();


  const existingExpense =
    database
      .prepare(`
        SELECT *
        FROM expenses

        WHERE id = ?

          AND store_id = ?

        LIMIT 1
      `)
      .get(
        expenseId,
        STORE_ID,
      );


  if (!existingExpense) {
    throw new Error(
      "Expense was not found.",
    );
  }


  if (
    existingExpense.status ===
    "VOIDED"
  ) {
    throw new Error(
      "Expense has already been voided.",
    );
  }


  database
    .prepare(`
      UPDATE expenses

      SET
        status = 'VOIDED',

        updated_at =
          CURRENT_TIMESTAMP,

        sync_status =
          'PENDING'

      WHERE id = ?

        AND store_id = ?
    `)
    .run(
      expenseId,
      STORE_ID,
    );


  const updatedExpense =
    database
      .prepare(`
        SELECT *
        FROM expenses

        WHERE id = ?

        LIMIT 1
      `)
      .get(
        expenseId,
      );


  return mapExpense(
    updatedExpense,
  );
}


/* =========================================
   REGISTER EXPENSE HANDLERS
========================================= */

export function registerExpenseHandlers(
  ipcMain,
) {

  /* =====================================
     CREATE
  ===================================== */

  ipcMain.handle(
    "expenses:create",
    (
      _event,
      expense,
    ) => {
      try {
        return createExpense(
          expense,
        );

      } catch (error) {
        console.error(
          "Unable to create expense:",
          error,
        );

        throw new Error(
          error?.message ||
          "The expense could not be saved.",
        );
      }
    },
  );


  /* =====================================
     GET ALL
  ===================================== */

  ipcMain.handle(
    "expenses:getAll",
    (
      _event,
      limit,
    ) => {
      try {
        return getAllExpenses(
          limit,
        );

      } catch (error) {
        console.error(
          "Unable to load expenses:",
          error,
        );

        throw new Error(
          error?.message ||
          "Expenses could not be loaded.",
        );
      }
    },
  );


  /* =====================================
     TODAY
  ===================================== */

  ipcMain.handle(
    "expenses:getToday",
    () => {
      try {
        return getTodayExpenses();

      } catch (error) {
        console.error(
          "Unable to load today's expenses:",
          error,
        );

        throw new Error(
          error?.message ||
          "Today's expenses could not be loaded.",
        );
      }
    },
  );


  /* =====================================
     DATE RANGE
  ===================================== */

  ipcMain.handle(
    "expenses:getByDateRange",
    (
      _event,
      {
        startDate,
        endDate,
      },
    ) => {
      try {
        return getExpensesByDateRange(
          startDate,
          endDate,
        );

      } catch (error) {
        console.error(
          "Unable to load expense range:",
          error,
        );

        throw new Error(
          error?.message ||
          "Expense range could not be loaded.",
        );
      }
    },
  );


  /* =====================================
     SUMMARY
  ===================================== */

  ipcMain.handle(
    "expenses:getSummary",
    (
      _event,
      filters = {},
    ) => {
      try {
        return getExpenseSummary(
          filters.startDate ??
            null,

          filters.endDate ??
            null,
        );

      } catch (error) {
        console.error(
          "Unable to load expense summary:",
          error,
        );

        throw new Error(
          error?.message ||
          "Expense summary could not be loaded.",
        );
      }
    },
  );


  /* =====================================
     TODAY SUMMARY
  ===================================== */

  ipcMain.handle(
    "expenses:getTodaySummary",
    () => {
      try {
        return getTodayExpenseSummary();

      } catch (error) {
        console.error(
          "Unable to load today's expense summary:",
          error,
        );

        throw new Error(
          error?.message ||
          "Today's expense summary could not be loaded.",
        );
      }
    },
  );


  /* =====================================
     VOID
  ===================================== */

  ipcMain.handle(
    "expenses:void",
    (
      _event,
      expenseId,
    ) => {
      try {
        return voidExpense(
          expenseId,
        );

      } catch (error) {
        console.error(
          "Unable to void expense:",
          error,
        );

        throw new Error(
          error?.message ||
          "The expense could not be voided.",
        );
      }
    },
  );
}