export function createDatabaseSchema(database) {
  /* ===========================================
     1. CREATE TABLES
  =========================================== */

  database.exec(`
    /* ===========================================
       STORES
    =========================================== */

    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP
    );


    /* ===========================================
       STORE SETTINGS
    =========================================== */

    CREATE TABLE IF NOT EXISTS store_settings (
      store_id TEXT PRIMARY KEY,

      vat_rate_basis_points INTEGER NOT NULL DEFAULT 1600
        CHECK (
          vat_rate_basis_points >= 0
          AND vat_rate_basis_points <= 10000
        ),

      receipt_preference TEXT NOT NULL DEFAULT 'ASK'
        CHECK (
          receipt_preference IN (
            'ASK',
            'ALWAYS',
            'NEVER'
          )
        ),

      receipt_paper_width_mm INTEGER NOT NULL DEFAULT 80
        CHECK (
          receipt_paper_width_mm >= 40
          AND receipt_paper_width_mm <= 120
        ),

      receipt_printer_name TEXT,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    );


    /* ===========================================
       REGISTERS
    =========================================== */

    CREATE TABLE IF NOT EXISTS registers (
      id TEXT PRIMARY KEY,

      store_id TEXT NOT NULL,

      name TEXT NOT NULL,

      device_id TEXT NOT NULL UNIQUE,

      is_active INTEGER NOT NULL DEFAULT 1
        CHECK (
          is_active IN (0, 1)
        ),

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    );


    /* ===========================================
       CATEGORIES
    =========================================== */

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,

      store_id TEXT NOT NULL,

      name TEXT NOT NULL,

      description TEXT,

      is_active INTEGER NOT NULL DEFAULT 1
        CHECK (
          is_active IN (0, 1)
        ),

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
          sync_status IN (
            'PENDING',
            'SYNCED',
            'FAILED'
          )
        ),

      FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      UNIQUE (
        store_id,
        name
      )
    );


    /* ===========================================
       PRODUCTS
    =========================================== */

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,

      store_id TEXT NOT NULL,

      category_id TEXT,

      barcode TEXT,

      sku TEXT,

      name TEXT NOT NULL,

      description TEXT,

      selling_price_cents INTEGER NOT NULL
        CHECK (
          selling_price_cents >= 0
        ),

      cost_price_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          cost_price_cents >= 0
        ),

      tax_rate_basis_points INTEGER NOT NULL DEFAULT 0
        CHECK (
          tax_rate_basis_points >= 0
          AND
          tax_rate_basis_points <= 10000
        ),

      is_taxable INTEGER NOT NULL DEFAULT 1
        CHECK (
          is_taxable IN (0, 1)
        ),

      track_inventory INTEGER NOT NULL DEFAULT 1
        CHECK (
          track_inventory IN (0, 1)
        ),

      is_active INTEGER NOT NULL DEFAULT 1
        CHECK (
          is_active IN (0, 1)
        ),

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
          sync_status IN (
            'PENDING',
            'SYNCED',
            'FAILED'
          )
        ),

      FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

      UNIQUE (
        store_id,
        barcode
      ),

      UNIQUE (
        store_id,
        sku
      )
    );


    /* ===========================================
       INVENTORY BALANCES
    =========================================== */

    CREATE TABLE IF NOT EXISTS inventory_balances (
      product_id TEXT NOT NULL,

      register_id TEXT NOT NULL,

      quantity REAL NOT NULL DEFAULT 0,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY (
        product_id,
        register_id
      ),

      FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      FOREIGN KEY (register_id)
        REFERENCES registers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    );


    /* ===========================================
       INVENTORY TRANSACTION HISTORY
    =========================================== */

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,

      product_id TEXT NOT NULL,

      register_id TEXT NOT NULL,

      transaction_type TEXT NOT NULL
        CHECK (
          transaction_type IN (
            'SALE',
            'ADJUSTMENT',
            'RETURN',
            'RESTOCK'
          )
        ),

      quantity_change REAL NOT NULL,

      previous_quantity REAL NOT NULL,

      resulting_quantity REAL NOT NULL,

      reference_id TEXT,

      reason TEXT,

      notes TEXT,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
          sync_status IN (
            'PENDING',
            'SYNCED',
            'FAILED'
          )
        ),

      FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      FOREIGN KEY (register_id)
        REFERENCES registers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    );


    /* ===========================================
       SALES
    =========================================== */

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,

      sale_number TEXT NOT NULL UNIQUE,

      store_id TEXT NOT NULL,

      register_id TEXT NOT NULL,

      subtotal_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          subtotal_cents >= 0
        ),

      discount_type TEXT NOT NULL DEFAULT 'NONE'
        CHECK (
          discount_type IN (
            'NONE',
            'FIXED',
            'PERCENT'
          )
        ),

      discount_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          discount_cents >= 0
        ),

      discount_rate_basis_points INTEGER
        CHECK (
          discount_rate_basis_points IS NULL
          OR (
            discount_rate_basis_points >= 0
            AND
            discount_rate_basis_points <= 10000
          )
        ),

      discount_reason TEXT,

      tax_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          tax_cents >= 0
        ),

      total_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          total_cents >= 0
        ),

      payment_method TEXT NOT NULL DEFAULT 'CASH'
        CHECK (
          payment_method IN (
            'CASH',
            'MPESA',
            'SPLIT'
          )
        ),

      status TEXT NOT NULL DEFAULT 'COMPLETED'
        CHECK (
          status IN (
            'COMPLETED',
            'VOIDED',
            'REFUNDED'
          )
        ),

      completed_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
          sync_status IN (
            'PENDING',
            'SYNCED',
            'FAILED'
          )
        ),

      FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      FOREIGN KEY (register_id)
        REFERENCES registers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    );


    /* ===========================================
       SALE ITEMS
    =========================================== */

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,

      sale_id TEXT NOT NULL,

      product_id TEXT NOT NULL,

      product_name TEXT NOT NULL,

      barcode TEXT,

      sku TEXT,

      quantity REAL NOT NULL
        CHECK (
          quantity > 0
        ),

      unit_price_cents INTEGER NOT NULL
        CHECK (
          unit_price_cents >= 0
        ),

      unit_cost_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          unit_cost_cents >= 0
        ),

      tax_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          tax_cents >= 0
        ),

      discount_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          discount_cents >= 0
        ),

      line_total_cents INTEGER NOT NULL
        CHECK (
          line_total_cents >= 0
        ),

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
          sync_status IN (
            'PENDING',
            'SYNCED',
            'FAILED'
          )
        ),

      FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    );


    /* ===========================================
       PAYMENTS
    =========================================== */

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,

      sale_id TEXT NOT NULL,

      payment_method TEXT NOT NULL
        CHECK (
          payment_method IN (
            'CASH',
            'CARD',
            'MOBILE_MONEY',
            'OTHER'
          )
        ),

      amount_cents INTEGER NOT NULL
        CHECK (
          amount_cents >= 0
        ),

      amount_received_cents INTEGER
        CHECK (
          amount_received_cents IS NULL
          OR
          amount_received_cents >= 0
        ),

      change_given_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          change_given_cents >= 0
        ),

      reference_number TEXT,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
          sync_status IN (
            'PENDING',
            'SYNCED',
            'FAILED'
          )
        ),

      FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    );


    /* ===========================================
       EXPENSES
    =========================================== */

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,

      store_id TEXT NOT NULL,

      register_id TEXT NOT NULL,

      category TEXT NOT NULL,

      description TEXT NOT NULL,

      amount_cents INTEGER NOT NULL
        CHECK (
          amount_cents > 0
        ),

      payment_method TEXT NOT NULL DEFAULT 'CASH'
        CHECK (
          payment_method IN (
            'CASH',
            'MPESA',
            'BANK',
            'OTHER'
          )
        ),

      reference_number TEXT,

      notes TEXT,

      status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (
          status IN (
            'ACTIVE',
            'VOIDED'
          )
        ),

      expense_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
          sync_status IN (
            'PENDING',
            'SYNCED',
            'FAILED'
          )
        ),

      FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      FOREIGN KEY (register_id)
        REFERENCES registers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    );


    /* ===========================================
       PURCHASES / STOCK RECEIPTS
    =========================================== */

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,

      purchase_number TEXT NOT NULL UNIQUE,

      store_id TEXT NOT NULL,

      register_id TEXT NOT NULL,

      supplier_name TEXT,

      payment_method TEXT NOT NULL DEFAULT 'CASH'
        CHECK (
          payment_method IN (
            'CASH',
            'MPESA',
            'BANK',
            'CREDIT',
            'OTHER'
          )
        ),

      reference_number TEXT,

      subtotal_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          subtotal_cents >= 0
        ),

      discount_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          discount_cents >= 0
        ),

      total_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          total_cents >= 0
        ),

      status TEXT NOT NULL DEFAULT 'COMPLETED'
        CHECK (
          status IN (
            'COMPLETED',
            'VOIDED'
          )
        ),

      notes TEXT,

      purchased_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
          sync_status IN (
            'PENDING',
            'SYNCED',
            'FAILED'
          )
        ),

      FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      FOREIGN KEY (register_id)
        REFERENCES registers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    );


    /* ===========================================
       PURCHASE ITEMS
    =========================================== */

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,

      purchase_id TEXT NOT NULL,

      product_id TEXT NOT NULL,

      product_name TEXT NOT NULL,

      barcode TEXT,

      sku TEXT,

      quantity REAL NOT NULL
        CHECK (
          quantity > 0
        ),

      previous_quantity REAL NOT NULL DEFAULT 0,

      resulting_quantity REAL NOT NULL DEFAULT 0,

      old_cost_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          old_cost_cents >= 0
        ),

      supplier_unit_cost_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          supplier_unit_cost_cents >= 0
        ),

      gross_cost_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          gross_cost_cents >= 0
        ),

      discount_type TEXT NOT NULL DEFAULT 'NONE'
        CHECK (
          discount_type IN (
            'NONE',
            'PERCENT',
            'FIXED'
          )
        ),

      discount_rate_basis_points INTEGER
        CHECK (
          discount_rate_basis_points IS NULL
          OR (
            discount_rate_basis_points >= 0
            AND
            discount_rate_basis_points <= 10000
          )
        ),

      discount_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          discount_cents >= 0
        ),

      net_cost_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          net_cost_cents >= 0
        ),

      effective_unit_cost_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          effective_unit_cost_cents >= 0
        ),

      average_cost_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          average_cost_cents >= 0
        ),

      previous_selling_price_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          previous_selling_price_cents >= 0
        ),

      new_selling_price_cents INTEGER NOT NULL DEFAULT 0
        CHECK (
          new_selling_price_cents >= 0
        ),

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (purchase_id)
        REFERENCES purchases(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    );


    /* ===========================================
       SYNC QUEUE
    =========================================== */

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      operation_id TEXT NOT NULL UNIQUE,

      entity_type TEXT NOT NULL,

      entity_id TEXT NOT NULL,

      operation_type TEXT NOT NULL
        CHECK (
          operation_type IN (
            'CREATE',
            'UPDATE',
            'DELETE'
          )
        ),

      payload TEXT NOT NULL,

      status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
          status IN (
            'PENDING',
            'PROCESSING',
            'SYNCED',
            'FAILED'
          )
        ),

      attempt_count INTEGER NOT NULL DEFAULT 0,

      last_error TEXT,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      last_attempt_at TEXT,

      synced_at TEXT
    );
  `);


  /* ===========================================
     2. MIGRATE EXISTING DATABASE
  =========================================== */

  /*
   * CREATE TABLE IF NOT EXISTS does not add
   * newly introduced columns to an existing
   * SQLite table.
   *
   * Existing tables therefore need explicit
   * migrations where applicable.
   */


  /* ===========================================
     SALES MIGRATIONS
  =========================================== */

  const salesColumns =
    database
      .prepare(`
        PRAGMA table_info(sales)
      `)
      .all()
      .map(
        (column) =>
          column.name,
      );


  if (
    !salesColumns.includes(
      "discount_type",
    )
  ) {
    database.exec(`
      ALTER TABLE sales
      ADD COLUMN discount_type
        TEXT NOT NULL DEFAULT 'NONE'
        CHECK (
          discount_type IN (
            'NONE',
            'FIXED',
            'PERCENT'
          )
        );
    `);
  }


  if (
    !salesColumns.includes(
      "discount_cents",
    )
  ) {
    database.exec(`
      ALTER TABLE sales
      ADD COLUMN discount_cents
        INTEGER NOT NULL DEFAULT 0
        CHECK (
          discount_cents >= 0
        );
    `);
  }


  if (
    !salesColumns.includes(
      "discount_rate_basis_points",
    )
  ) {
    database.exec(`
      ALTER TABLE sales
      ADD COLUMN discount_rate_basis_points
        INTEGER;
    `);
  }


  if (
    !salesColumns.includes(
      "discount_reason",
    )
  ) {
    database.exec(`
      ALTER TABLE sales
      ADD COLUMN discount_reason TEXT;
    `);
  }


  if (
    !salesColumns.includes(
      "payment_method",
    )
  ) {
    database.exec(`
      ALTER TABLE sales
      ADD COLUMN payment_method
        TEXT NOT NULL DEFAULT 'CASH'
        CHECK (
          payment_method IN (
            'CASH',
            'MPESA',
            'SPLIT'
          )
        );
    `);
  }


  /* ===========================================
     SALE ITEM MIGRATIONS
  =========================================== */

  const saleItemColumns =
    database
      .prepare(`
        PRAGMA table_info(sale_items)
      `)
      .all()
      .map(
        (column) =>
          column.name,
      );


  if (
    !saleItemColumns.includes(
      "sku",
    )
  ) {
    database.exec(`
      ALTER TABLE sale_items
      ADD COLUMN sku TEXT;
    `);
  }


  if (
    !saleItemColumns.includes(
      "unit_cost_cents",
    )
  ) {
    database.exec(`
      ALTER TABLE sale_items
      ADD COLUMN unit_cost_cents
        INTEGER NOT NULL DEFAULT 0
        CHECK (
          unit_cost_cents >= 0
        );
    `);
  }


  /* ===========================================
     INVENTORY TRANSACTION MIGRATIONS
  =========================================== */

  const inventoryTransactionColumns =
    database
      .prepare(`
        PRAGMA table_info(
          inventory_transactions
        )
      `)
      .all()
      .map(
        (column) =>
          column.name,
      );


  if (
    !inventoryTransactionColumns.includes(
      "reason",
    )
  ) {
    database.exec(`
      ALTER TABLE inventory_transactions
      ADD COLUMN reason TEXT;
    `);
  }


  if (
    !inventoryTransactionColumns.includes(
      "notes",
    )
  ) {
    database.exec(`
      ALTER TABLE inventory_transactions
      ADD COLUMN notes TEXT;
    `);
  }


  /* ===========================================
     PRODUCT MIGRATIONS
  =========================================== */

  const productColumns =
    database
      .prepare(`
        PRAGMA table_info(products)
      `)
      .all()
      .map(
        (column) =>
          column.name,
      );


  if (
    !productColumns.includes(
      "is_taxable",
    )
  ) {
    database.exec(`
      ALTER TABLE products
      ADD COLUMN is_taxable
        INTEGER NOT NULL DEFAULT 1
        CHECK (
          is_taxable IN (0, 1)
        );
    `);
  }


  if (
    !productColumns.includes(
      "track_inventory",
    )
  ) {
    database.exec(`
      ALTER TABLE products
      ADD COLUMN track_inventory
        INTEGER NOT NULL DEFAULT 1
        CHECK (
          track_inventory IN (0, 1)
        );
    `);
  }


  if (
    !productColumns.includes(
      "is_active",
    )
  ) {
    database.exec(`
      ALTER TABLE products
      ADD COLUMN is_active
        INTEGER NOT NULL DEFAULT 1
        CHECK (
          is_active IN (0, 1)
        );
    `);
  }


  /* ===========================================
     STORE SETTINGS MIGRATIONS
  =========================================== */

  const storeSettingsColumns =
    database
      .prepare(`
        PRAGMA table_info(store_settings)
      `)
      .all()
      .map(
        (column) =>
          column.name,
      );


  if (
    !storeSettingsColumns.includes(
      "receipt_preference",
    )
  ) {
    database.exec(`
      ALTER TABLE store_settings
      ADD COLUMN receipt_preference
        TEXT NOT NULL DEFAULT 'ASK'
        CHECK (
          receipt_preference IN (
            'ASK',
            'ALWAYS',
            'NEVER'
          )
        );
    `);
  }


  if (
    !storeSettingsColumns.includes(
      "receipt_paper_width_mm",
    )
  ) {
    database.exec(`
      ALTER TABLE store_settings
      ADD COLUMN receipt_paper_width_mm
        INTEGER NOT NULL DEFAULT 80
        CHECK (
          receipt_paper_width_mm >= 40
          AND receipt_paper_width_mm <= 120
        );
    `);
  }


  if (
    !storeSettingsColumns.includes(
      "receipt_printer_name",
    )
  ) {
    database.exec(`
      ALTER TABLE store_settings
      ADD COLUMN receipt_printer_name TEXT;
    `);
  }


  /* ===========================================
     3. CREATE INDEXES
     AFTER MIGRATIONS
  =========================================== */

  database.exec(`
    /* ===========================================
       PRODUCT INDEXES
    =========================================== */

    CREATE INDEX IF NOT EXISTS
      idx_products_name
    ON products(
      name
    );


    CREATE INDEX IF NOT EXISTS
      idx_products_barcode
    ON products(
      barcode
    );


    CREATE INDEX IF NOT EXISTS
      idx_products_category_id
    ON products(
      category_id
    );


    CREATE INDEX IF NOT EXISTS
      idx_products_store_active
    ON products(
      store_id,
      is_active
    );


    /* ===========================================
       INVENTORY INDEXES
    =========================================== */

    CREATE INDEX IF NOT EXISTS
      idx_inventory_transactions_product
    ON inventory_transactions(
      product_id
    );


    CREATE INDEX IF NOT EXISTS
      idx_inventory_transactions_register
    ON inventory_transactions(
      register_id
    );


    CREATE INDEX IF NOT EXISTS
      idx_inventory_transactions_created_at
    ON inventory_transactions(
      created_at
    );


    CREATE INDEX IF NOT EXISTS
      idx_inventory_transactions_reference
    ON inventory_transactions(
      reference_id
    );


    /* ===========================================
       SALES INDEXES
    =========================================== */

    CREATE INDEX IF NOT EXISTS
      idx_sales_completed_at
    ON sales(
      completed_at
    );


    CREATE INDEX IF NOT EXISTS
      idx_sales_store_completed_at
    ON sales(
      store_id,
      completed_at
    );


    CREATE INDEX IF NOT EXISTS
      idx_sales_register_completed_at
    ON sales(
      register_id,
      completed_at
    );


    CREATE INDEX IF NOT EXISTS
      idx_sales_status
    ON sales(
      status
    );


    CREATE INDEX IF NOT EXISTS
      idx_sales_payment_method
    ON sales(
      payment_method
    );


    CREATE INDEX IF NOT EXISTS
      idx_sales_discount_type
    ON sales(
      discount_type
    );


    /* ===========================================
       SALE ITEM INDEXES
    =========================================== */

    CREATE INDEX IF NOT EXISTS
      idx_sale_items_sale_id
    ON sale_items(
      sale_id
    );


    CREATE INDEX IF NOT EXISTS
      idx_sale_items_product_id
    ON sale_items(
      product_id
    );


    CREATE INDEX IF NOT EXISTS
      idx_sale_items_created_at
    ON sale_items(
      created_at
    );


    /* ===========================================
       PAYMENT INDEXES
    =========================================== */

    CREATE INDEX IF NOT EXISTS
      idx_payments_sale_id
    ON payments(
      sale_id
    );


    CREATE INDEX IF NOT EXISTS
      idx_payments_method
    ON payments(
      payment_method
    );


    CREATE INDEX IF NOT EXISTS
      idx_payments_created_at
    ON payments(
      created_at
    );


    CREATE INDEX IF NOT EXISTS
      idx_payments_reference
    ON payments(
      reference_number
    );


    /* ===========================================
       EXPENSE INDEXES
    =========================================== */

    CREATE INDEX IF NOT EXISTS
      idx_expenses_store
    ON expenses(
      store_id
    );


    CREATE INDEX IF NOT EXISTS
      idx_expenses_register
    ON expenses(
      register_id
    );


    CREATE INDEX IF NOT EXISTS
      idx_expenses_expense_at
    ON expenses(
      expense_at
    );


    CREATE INDEX IF NOT EXISTS
      idx_expenses_store_expense_at
    ON expenses(
      store_id,
      expense_at
    );


    CREATE INDEX IF NOT EXISTS
      idx_expenses_payment_method
    ON expenses(
      payment_method
    );


    CREATE INDEX IF NOT EXISTS
      idx_expenses_category
    ON expenses(
      category
    );


    CREATE INDEX IF NOT EXISTS
      idx_expenses_status
    ON expenses(
      status
    );


    /* ===========================================
       PURCHASE INDEXES
    =========================================== */

    CREATE INDEX IF NOT EXISTS
      idx_purchases_store
    ON purchases(
      store_id
    );


    CREATE INDEX IF NOT EXISTS
      idx_purchases_register
    ON purchases(
      register_id
    );


    CREATE INDEX IF NOT EXISTS
      idx_purchases_purchased_at
    ON purchases(
      purchased_at
    );


    CREATE INDEX IF NOT EXISTS
      idx_purchases_store_purchased_at
    ON purchases(
      store_id,
      purchased_at
    );


    CREATE INDEX IF NOT EXISTS
      idx_purchases_payment_method
    ON purchases(
      payment_method
    );


    CREATE INDEX IF NOT EXISTS
      idx_purchases_status
    ON purchases(
      status
    );


    CREATE INDEX IF NOT EXISTS
      idx_purchase_items_purchase_id
    ON purchase_items(
      purchase_id
    );


    CREATE INDEX IF NOT EXISTS
      idx_purchase_items_product_id
    ON purchase_items(
      product_id
    );


    /* ===========================================
       SYNC INDEXES
    =========================================== */

    CREATE INDEX IF NOT EXISTS
      idx_sync_queue_status
    ON sync_queue(
      status
    );


    CREATE INDEX IF NOT EXISTS
      idx_sync_queue_entity
    ON sync_queue(
      entity_type,
      entity_id
    );
  `);


  console.log(
    "Database schema created successfully.",
  );
}