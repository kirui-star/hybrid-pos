-- ============================================================
-- INVENTRA CLOUD DATABASE
-- MySQL / MariaDB
-- Based on the existing Inventra / HybridPOS SQLite schema
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;


-- ============================================================
-- 1. STORES
-- ============================================================

CREATE TABLE IF NOT EXISTS stores (
    id VARCHAR(64) NOT NULL,

    name VARCHAR(150) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(50),

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 2. STORE SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS store_settings (
    store_id VARCHAR(64) NOT NULL,

    vat_rate_basis_points INT NOT NULL
        DEFAULT 1600,

    receipt_preference ENUM(
        'ASK',
        'ALWAYS',
        'NEVER'
    ) NOT NULL
        DEFAULT 'ASK',

    receipt_paper_width_mm INT NOT NULL
        DEFAULT 80,

    receipt_printer_name VARCHAR(255),

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (store_id),

    CONSTRAINT fk_store_settings_store
        FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 3. REGISTERS
-- ============================================================

CREATE TABLE IF NOT EXISTS registers (
    id VARCHAR(64) NOT NULL,

    store_id VARCHAR(64) NOT NULL,

    name VARCHAR(150) NOT NULL,

    device_id VARCHAR(191) NOT NULL,

    is_active TINYINT(1) NOT NULL
        DEFAULT 1,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_register_device_id (
        device_id
    ),

    KEY idx_registers_store_id (
        store_id
    ),

    CONSTRAINT fk_registers_store
        FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(64) NOT NULL,

    store_id VARCHAR(64) NOT NULL,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    is_active TINYINT(1) NOT NULL
        DEFAULT 1,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_categories_store_name (
        store_id,
        name
    ),

    KEY idx_categories_store_id (
        store_id
    ),

    CONSTRAINT fk_categories_store
        FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,

  store_id VARCHAR(64) NOT NULL,

  category_id VARCHAR(64) NULL,

  barcode VARCHAR(255) NULL,

  sku VARCHAR(255) NULL,

  name VARCHAR(255) NOT NULL,

  description TEXT NULL,

  selling_price_cents BIGINT NOT NULL,

  cost_price_cents BIGINT NOT NULL DEFAULT 0,

  tax_rate_basis_points INT NOT NULL DEFAULT 0,

  is_taxable TINYINT(1) NOT NULL DEFAULT 1,

  track_inventory TINYINT(1) NOT NULL DEFAULT 1,

  is_active TINYINT(1) NOT NULL DEFAULT 1,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  sync_status ENUM(
    'PENDING',
    'SYNCED',
    'FAILED'
  ) NOT NULL DEFAULT 'PENDING',

  CONSTRAINT fk_products_store
    FOREIGN KEY (store_id)
    REFERENCES stores(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id)
    REFERENCES categories(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT chk_products_selling_price
    CHECK (selling_price_cents >= 0),

  CONSTRAINT chk_products_cost_price
    CHECK (cost_price_cents >= 0),

  CONSTRAINT chk_products_tax_rate
    CHECK (
      tax_rate_basis_points >= 0
      AND tax_rate_basis_points <= 10000
    ),

  CONSTRAINT chk_products_is_taxable
    CHECK (is_taxable IN (0, 1)),

  CONSTRAINT chk_products_track_inventory
    CHECK (track_inventory IN (0, 1)),

  CONSTRAINT chk_products_is_active
    CHECK (is_active IN (0, 1)),

  UNIQUE KEY uq_products_store_barcode (
    store_id,
    barcode
  ),

  UNIQUE KEY uq_products_store_sku (
    store_id,
    sku
  )
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 6. INVENTORY BALANCES
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_balances (
    product_id VARCHAR(64) NOT NULL,

    register_id VARCHAR(64) NOT NULL,

    quantity DECIMAL(18,3) NOT NULL
        DEFAULT 0.000,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (
        product_id,
        register_id
    ),

    KEY idx_inventory_balances_register (
        register_id
    ),

    CONSTRAINT fk_inventory_balances_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_inventory_balances_register
        FOREIGN KEY (register_id)
        REFERENCES registers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 7. INVENTORY TRANSACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id VARCHAR(64) NOT NULL,

    product_id VARCHAR(64) NOT NULL,

    register_id VARCHAR(64) NOT NULL,

    transaction_type ENUM(
        'SALE',
        'ADJUSTMENT',
        'RETURN',
        'RESTOCK'
    ) NOT NULL,

    quantity_change DECIMAL(18,3) NOT NULL,

    previous_quantity DECIMAL(18,3) NOT NULL,

    resulting_quantity DECIMAL(18,3) NOT NULL,

    reference_id VARCHAR(64),

    reason VARCHAR(255),

    notes TEXT,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_inventory_transactions_product (
        product_id
    ),

    KEY idx_inventory_transactions_register (
        register_id
    ),

    KEY idx_inventory_transactions_created_at (
        created_at
    ),

    KEY idx_inventory_transactions_reference (
        reference_id
    ),

    CONSTRAINT fk_inventory_transactions_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_inventory_transactions_register
        FOREIGN KEY (register_id)
        REFERENCES registers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 8. SALES
-- ============================================================

CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(64) NOT NULL,

    sale_number VARCHAR(100) NOT NULL,

    store_id VARCHAR(64) NOT NULL,

    register_id VARCHAR(64) NOT NULL,

    subtotal_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    discount_type ENUM(
        'NONE',
        'FIXED',
        'PERCENT'
    ) NOT NULL
        DEFAULT 'NONE',

    discount_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    discount_rate_basis_points INT UNSIGNED,

    discount_reason VARCHAR(255),

    tax_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    total_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    payment_method ENUM(
        'CASH',
        'MPESA',
        'SPLIT'
    ) NOT NULL
        DEFAULT 'CASH',

    status ENUM(
        'COMPLETED',
        'VOIDED',
        'REFUNDED'
    ) NOT NULL
        DEFAULT 'COMPLETED',

    completed_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_sales_sale_number (
        sale_number
    ),

    KEY idx_sales_store_completed_at (
        store_id,
        completed_at
    ),

    KEY idx_sales_register_completed_at (
        register_id,
        completed_at
    ),

    KEY idx_sales_status (
        status
    ),

    KEY idx_sales_payment_method (
        payment_method
    ),

    KEY idx_sales_discount_type (
        discount_type
    ),

    CONSTRAINT fk_sales_store
        FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_sales_register
        FOREIGN KEY (register_id)
        REFERENCES registers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 9. SALE ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS sale_items (
    id VARCHAR(64) NOT NULL,

    sale_id VARCHAR(64) NOT NULL,

    product_id VARCHAR(64) NOT NULL,

    product_name VARCHAR(200) NOT NULL,

    barcode VARCHAR(191),

    sku VARCHAR(191),

    quantity DECIMAL(18,3) NOT NULL,

    unit_price_cents BIGINT UNSIGNED NOT NULL,

    unit_cost_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    tax_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    discount_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    line_total_cents BIGINT UNSIGNED NOT NULL,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_sale_items_sale_id (
        sale_id
    ),

    KEY idx_sale_items_product_id (
        product_id
    ),

    KEY idx_sale_items_created_at (
        created_at
    ),

    CONSTRAINT fk_sale_items_sale
        FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_sale_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 10. PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) NOT NULL,

    sale_id VARCHAR(64) NOT NULL,

    payment_method ENUM(
        'CASH',
        'CARD',
        'MOBILE_MONEY',
        'OTHER'
    ) NOT NULL,

    amount_cents BIGINT UNSIGNED NOT NULL,

    amount_received_cents BIGINT UNSIGNED,

    change_given_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    reference_number VARCHAR(191),

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_payments_sale_id (
        sale_id
    ),

    KEY idx_payments_method (
        payment_method
    ),

    KEY idx_payments_created_at (
        created_at
    ),

    KEY idx_payments_reference (
        reference_number
    ),

    CONSTRAINT fk_payments_sale
        FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 11. EXPENSES
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(64) NOT NULL,

    store_id VARCHAR(64) NOT NULL,

    register_id VARCHAR(64) NOT NULL,

    category VARCHAR(150) NOT NULL,

    description VARCHAR(255) NOT NULL,

    amount_cents BIGINT UNSIGNED NOT NULL,

    payment_method ENUM(
        'CASH',
        'MPESA',
        'BANK',
        'OTHER'
    ) NOT NULL
        DEFAULT 'CASH',

    reference_number VARCHAR(191),

    notes TEXT,

    status ENUM(
        'ACTIVE',
        'VOIDED'
    ) NOT NULL
        DEFAULT 'ACTIVE',

    expense_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_expenses_store (
        store_id
    ),

    KEY idx_expenses_register (
        register_id
    ),

    KEY idx_expenses_expense_at (
        expense_at
    ),

    KEY idx_expenses_store_expense_at (
        store_id,
        expense_at
    ),

    KEY idx_expenses_payment_method (
        payment_method
    ),

    KEY idx_expenses_category (
        category
    ),

    KEY idx_expenses_status (
        status
    ),

    CONSTRAINT fk_expenses_store
        FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_expenses_register
        FOREIGN KEY (register_id)
        REFERENCES registers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 12. PURCHASES
-- ============================================================

CREATE TABLE IF NOT EXISTS purchases (
    id VARCHAR(64) NOT NULL,

    purchase_number VARCHAR(100) NOT NULL,

    store_id VARCHAR(64) NOT NULL,

    register_id VARCHAR(64) NOT NULL,

    supplier_name VARCHAR(200),

    payment_method ENUM(
        'CASH',
        'MPESA',
        'BANK',
        'CREDIT',
        'OTHER'
    ) NOT NULL
        DEFAULT 'CASH',

    reference_number VARCHAR(191),

    subtotal_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    discount_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    total_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    status ENUM(
        'COMPLETED',
        'VOIDED'
    ) NOT NULL
        DEFAULT 'COMPLETED',

    notes TEXT,

    purchased_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_purchases_purchase_number (
        purchase_number
    ),

    KEY idx_purchases_store (
        store_id
    ),

    KEY idx_purchases_register (
        register_id
    ),

    KEY idx_purchases_purchased_at (
        purchased_at
    ),

    KEY idx_purchases_store_purchased_at (
        store_id,
        purchased_at
    ),

    KEY idx_purchases_payment_method (
        payment_method
    ),

    KEY idx_purchases_status (
        status
    ),

    CONSTRAINT fk_purchases_store
        FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_purchases_register
        FOREIGN KEY (register_id)
        REFERENCES registers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 13. PURCHASE ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_items (
    id VARCHAR(64) NOT NULL,

    purchase_id VARCHAR(64) NOT NULL,

    product_id VARCHAR(64) NOT NULL,

    product_name VARCHAR(200) NOT NULL,

    barcode VARCHAR(191),

    sku VARCHAR(191),

    quantity DECIMAL(18,3) NOT NULL,

    previous_quantity DECIMAL(18,3) NOT NULL
        DEFAULT 0.000,

    resulting_quantity DECIMAL(18,3) NOT NULL
        DEFAULT 0.000,

    old_cost_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    supplier_unit_cost_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    gross_cost_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    discount_type ENUM(
        'NONE',
        'PERCENT',
        'FIXED'
    ) NOT NULL
        DEFAULT 'NONE',

    discount_rate_basis_points INT UNSIGNED,

    discount_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    net_cost_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    effective_unit_cost_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    average_cost_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    previous_selling_price_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    new_selling_price_cents BIGINT UNSIGNED NOT NULL
        DEFAULT 0,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_purchase_items_purchase_id (
        purchase_id
    ),

    KEY idx_purchase_items_product_id (
        product_id
    ),

    CONSTRAINT fk_purchase_items_purchase
        FOREIGN KEY (purchase_id)
        REFERENCES purchases(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_purchase_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 14. PROCESSED SYNC OPERATIONS
-- CLOUD ONLY
--
-- The desktop keeps sync_queue.
-- This table prevents the cloud from processing the same
-- operation more than once.
-- ============================================================

CREATE TABLE IF NOT EXISTS processed_sync_operations (
    id BIGINT UNSIGNED NOT NULL
        AUTO_INCREMENT,

    operation_id VARCHAR(128) NOT NULL,

    entity_type VARCHAR(100) NOT NULL,

    entity_id VARCHAR(64) NOT NULL,

    operation_type ENUM(
        'CREATE',
        'UPDATE',
        'DELETE'
    ) NOT NULL,

    device_id VARCHAR(191),

    processed_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_processed_operation_id (
        operation_id
    ),

    KEY idx_processed_sync_entity (
        entity_type,
        entity_id
    ),

    KEY idx_processed_sync_device (
        device_id
    ),

    KEY idx_processed_sync_processed_at (
        processed_at
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


SET FOREIGN_KEY_CHECKS = 1;