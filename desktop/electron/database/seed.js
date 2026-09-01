export function seedDatabase(database) {
  const seed = database.transaction(() => {
    database
      .prepare(`
        INSERT OR IGNORE INTO stores (
          id,
          name,
          address,
          phone
        )
        VALUES (?, ?, ?, ?)
      `)
      .run(
        "store-001",
        "My Mini Supermarket",
        "Grand Rapids, Michigan",
        null
      );

    database
      .prepare(`
        INSERT OR IGNORE INTO registers (
          id,
          store_id,
          name,
          device_id
        )
        VALUES (?, ?, ?, ?)
      `)
      .run(
        "register-001",
        "store-001",
        "Register 01",
        "device-register-001"
      );

    const insertCategory = database.prepare(`
      INSERT OR IGNORE INTO categories (
        id,
        store_id,
        name,
        description
      )
      VALUES (?, ?, ?, ?)
    `);

    insertCategory.run(
      "category-beverages",
      "store-001",
      "Beverages",
      "Soft drinks, water, juice, milk, and other drinks"
    );

    insertCategory.run(
      "category-groceries",
      "store-001",
      "Groceries",
      "General grocery products"
    );

    insertCategory.run(
      "category-snacks",
      "store-001",
      "Snacks",
      "Chips, biscuits, candy, and other snacks"
    );

    const insertProduct = database.prepare(`
      INSERT OR IGNORE INTO products (
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
        track_inventory,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProduct.run(
      "product-coca-cola",
      "store-001",
      "category-beverages",
      "049000028911",
      "BEV-001",
      "Coca-Cola 20 oz",
      "Coca-Cola soft drink",
      249,
      150,
      600,
      1,
      1
    );

    insertProduct.run(
      "product-milk",
      "store-001",
      "category-beverages",
      "041383090039",
      "BEV-002",
      "Whole Milk 1 Gallon",
      "One gallon whole milk",
      499,
      375,
      0,
      1,
      1
    );

    insertProduct.run(
      "product-bread",
      "store-001",
      "category-groceries",
      "072250011372",
      "GRO-001",
      "White Bread",
      "Sliced white bread",
      299,
      180,
      0,
      1,
      1
    );

    insertProduct.run(
      "product-chips",
      "store-001",
      "category-snacks",
      "028400090896",
      "SNK-001",
      "Potato Chips",
      "Classic salted potato chips",
      349,
      210,
      600,
      1,
      1
    );

    const insertInventory = database.prepare(`
      INSERT OR IGNORE INTO inventory_balances (
        product_id,
        register_id,
        quantity
      )
      VALUES (?, ?, ?)
    `);

    insertInventory.run(
      "product-coca-cola",
      "register-001",
      40
    );

    insertInventory.run(
      "product-milk",
      "register-001",
      20
    );

    insertInventory.run(
      "product-bread",
      "register-001",
      25
    );

    insertInventory.run(
      "product-chips",
      "register-001",
      35
    );
  });

  seed();

  console.log("Database seed completed successfully.");
}