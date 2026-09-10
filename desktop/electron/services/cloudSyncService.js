import { fetchCloudProducts } from "./cloudProductService.js";
import { getDatabase } from "../database/database.js";

export async function syncCloudProducts() {
  const database = getDatabase();

  const cloudProducts = await fetchCloudProducts();

  const findProduct = database.prepare(`
    SELECT id
    FROM products
    WHERE id = ?
  `);

  const insertProduct = database.prepare(`
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
      is_active,
      created_at,
      updated_at,
      sync_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateProduct = database.prepare(`
  UPDATE products
  SET
    store_id = ?,
    category_id = ?,
    barcode = ?,
    sku = ?,
    name = ?,
    description = ?,
    selling_price_cents = ?,
    cost_price_cents = ?,
    tax_rate_basis_points = ?,
    is_taxable = ?,
    track_inventory = ?,
    is_active = ?,
    updated_at = ?,
    sync_status = 'SYNCED'
  WHERE id = ?
`);

 let inserted = 0;
let updated = 0;

  for (const product of cloudProducts) {
    const existing = findProduct.get(product.id);

   if (existing) {
  updateProduct.run(
    product.store_id,
    product.category_id ?? null,
    product.barcode ?? null,
    product.sku ?? null,
    product.name,
    product.description ?? null,
    Number(product.selling_price_cents ?? 0),
    Number(product.cost_price_cents ?? 0),
    Number(product.tax_rate_basis_points ?? 0),
    Number(product.is_taxable ?? 1),
    Number(product.track_inventory ?? 1),
    Number(product.is_active ?? 1),
    product.updated_at ?? new Date().toISOString(),
    product.id
  );

  updated += 1;
  continue;
}

    insertProduct.run(
      product.id,
      product.store_id,
      product.category_id ?? null,
      product.barcode ?? null,
      product.sku ?? null,
      product.name,
      product.description ?? null,
      Number(product.selling_price_cents ?? 0),
      Number(product.cost_price_cents ?? 0),
      Number(product.tax_rate_basis_points ?? 0),
      Number(product.is_taxable ?? 1),
      Number(product.track_inventory ?? 1),
      Number(product.is_active ?? 1),
      product.created_at ?? new Date().toISOString(),
      product.updated_at ?? new Date().toISOString(),
      "SYNCED"
    );

    inserted += 1;
  }

 return {
  success: true,
  total: cloudProducts.length,
  inserted,
  updated,
};
}