import {
  getDatabase,
} from "../database/database.js";


const STORE_ID =
  "store-001";

const REGISTER_ID =
  "register-001";


function mapSale(
  row,
) {
  return {
    id:
      row.id,

    type:
      "SALE",

    reference:
      row.sale_number,

    date:
      row.completed_at,

    description:
      "Sale completed",

    amountCents:
      Number(
        row.total_cents ??
        0,
      ),

    direction:
      "IN",

    paymentMethod:
      row.payment_method,

    status:
      row.status,
  };
}


function mapPurchase(
  row,
) {
  return {
    id:
      row.id,

    type:
      "PURCHASE",

    reference:
      row.purchase_number,

    date:
      row.purchased_at,

    description:
      row.supplier_name
        ? `Stock purchase from ${row.supplier_name}`
        : "Stock purchase",

    amountCents:
      Number(
        row.total_cents ??
        0,
      ),

    direction:
      "OUT",

    paymentMethod:
      row.payment_method,

    status:
      row.status,
  };
}


function mapExpense(
  row,
) {
  return {
    id:
      row.id,

    type:
      "EXPENSE",

    reference:
      row.reference_number ||
      row.id,

    date:
      row.expense_at,

    description:
      row.description,

    amountCents:
      Number(
        row.amount_cents ??
        0,
      ),

    direction:
      "OUT",

    paymentMethod:
      row.payment_method,

    status:
      row.status,

    category:
      row.category,
  };
}


function mapInventoryAdjustment(
  row,
) {
  return {
    id:
      row.id,

    type:
      "INVENTORY_ADJUSTMENT",

    reference:
      row.reference_id ||
      row.id,

    date:
      row.created_at,

    description:
      row.reason ||
      "Inventory adjustment",

    amountCents:
      null,

    direction:
      "NONE",

    paymentMethod:
      null,

    status:
      "COMPLETED",

    productId:
      row.product_id,

    productName:
      row.product_name,

    quantityChange:
      Number(
        row.quantity_change ??
        0,
      ),

    previousQuantity:
      Number(
        row.previous_quantity ??
        0,
      ),

    resultingQuantity:
      Number(
        row.resulting_quantity ??
        0,
      ),

    notes:
      row.notes,
  };
}


export function getTransactionHistory({
  startDate = null,
  endDate = null,
  type = "ALL",
  paymentMethod = "ALL",
  search = "",
  limit = 500,
} = {}) {

  const database =
    getDatabase();


  const safeLimit =
    Math.min(
      Math.max(
        Number(limit) || 500,
        1,
      ),
      2000,
    );


  const transactions = [];


  if (
    type === "ALL" ||
    type === "SALE"
  ) {

    let sql = `
      SELECT
        id,
        sale_number,
        total_cents,
        payment_method,
        status,
        completed_at

      FROM sales

      WHERE store_id = ?
    `;

    const params = [
      STORE_ID,
    ];


    if (startDate) {
      sql += `
        AND date(
          completed_at,
          'localtime'
        ) >= date(?)
      `;

      params.push(
        startDate,
      );
    }


    if (endDate) {
      sql += `
        AND date(
          completed_at,
          'localtime'
        ) <= date(?)
      `;

      params.push(
        endDate,
      );
    }


    const rows =
      database
        .prepare(
          sql,
        )
        .all(
          ...params,
        );


    transactions.push(
      ...rows.map(
        mapSale,
      ),
    );
  }


  if (
    type === "ALL" ||
    type === "PURCHASE"
  ) {

    let sql = `
      SELECT
        id,
        purchase_number,
        supplier_name,
        payment_method,
        total_cents,
        status,
        purchased_at

      FROM purchases

      WHERE store_id = ?
    `;

    const params = [
      STORE_ID,
    ];


    if (startDate) {
      sql += `
        AND date(
          purchased_at,
          'localtime'
        ) >= date(?)
      `;

      params.push(
        startDate,
      );
    }


    if (endDate) {
      sql += `
        AND date(
          purchased_at,
          'localtime'
        ) <= date(?)
      `;

      params.push(
        endDate,
      );
    }


    const rows =
      database
        .prepare(
          sql,
        )
        .all(
          ...params,
        );


    transactions.push(
      ...rows.map(
        mapPurchase,
      ),
    );
  }


  if (
    type === "ALL" ||
    type === "EXPENSE"
  ) {

    let sql = `
      SELECT
        id,
        category,
        description,
        amount_cents,
        payment_method,
        reference_number,
        status,
        expense_at

      FROM expenses

      WHERE store_id = ?
    `;

    const params = [
      STORE_ID,
    ];


    if (startDate) {
      sql += `
        AND date(
          expense_at,
          'localtime'
        ) >= date(?)
      `;

      params.push(
        startDate,
      );
    }


    if (endDate) {
      sql += `
        AND date(
          expense_at,
          'localtime'
        ) <= date(?)
      `;

      params.push(
        endDate,
      );
    }


    const rows =
      database
        .prepare(
          sql,
        )
        .all(
          ...params,
        );


    transactions.push(
      ...rows.map(
        mapExpense,
      ),
    );
  }


  if (
    type === "ALL" ||
    type ===
      "INVENTORY_ADJUSTMENT"
  ) {

    let sql = `
      SELECT
        inventory_transactions.id,

        inventory_transactions.product_id,

        products.name AS product_name,

        inventory_transactions.quantity_change,

        inventory_transactions.previous_quantity,

        inventory_transactions.resulting_quantity,

        inventory_transactions.reference_id,

        inventory_transactions.reason,

        inventory_transactions.notes,

        inventory_transactions.created_at

      FROM inventory_transactions

      LEFT JOIN products
        ON products.id =
          inventory_transactions.product_id

      WHERE inventory_transactions.register_id = ?

        AND inventory_transactions.transaction_type =
          'ADJUSTMENT'
    `;

    const params = [
      REGISTER_ID,
    ];


    if (startDate) {
      sql += `
        AND date(
          inventory_transactions.created_at,
          'localtime'
        ) >= date(?)
      `;

      params.push(
        startDate,
      );
    }


    if (endDate) {
      sql += `
        AND date(
          inventory_transactions.created_at,
          'localtime'
        ) <= date(?)
      `;

      params.push(
        endDate,
      );
    }


    const rows =
      database
        .prepare(
          sql,
        )
        .all(
          ...params,
        );


    transactions.push(
      ...rows.map(
        mapInventoryAdjustment,
      ),
    );
  }


  let filtered =
    transactions;


  if (
    paymentMethod &&
    paymentMethod !== "ALL"
  ) {
    filtered =
      filtered.filter(
        (
          transaction,
        ) =>
          transaction
            .paymentMethod ===
          paymentMethod,
      );
  }


  const normalizedSearch =
    String(
      search ?? "",
    )
      .trim()
      .toLowerCase();


  if (
    normalizedSearch
  ) {
    filtered =
      filtered.filter(
        (
          transaction,
        ) => {

          const searchable =
            [
              transaction.reference,
              transaction.description,
              transaction.productName,
              transaction.category,
              transaction.paymentMethod,
              transaction.type,
            ]
              .filter(
                Boolean,
              )
              .join(
                " ",
              )
              .toLowerCase();


          return searchable
            .includes(
              normalizedSearch,
            );
        },
      );
  }


  filtered.sort(
    (
      first,
      second,
    ) => {

      const firstTime =
        new Date(
          first.date,
        ).getTime();


      const secondTime =
        new Date(
          second.date,
        ).getTime();


      return secondTime -
        firstTime;
    },
  );


  return filtered.slice(
    0,
    safeLimit,
  );
}