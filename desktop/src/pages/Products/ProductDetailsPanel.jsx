import "./ProductDetailsPanel.css";

import DetailCard from "../../components/ui/DetailCard";
import DetailRow from "../../components/ui/DetailRow";
import MarginBadge from "../../components/ui/MarginBadge";
import {
  DollarSign,
  Package,
  Info,
  FileText
} from "lucide-react";
function formatMoney(cents) {
  const numericCents = Number(cents);

  if (!Number.isFinite(numericCents)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numericCents / 100);
}

function formatQuantity(quantity) {
  const numericQuantity = Number(quantity);

  if (!Number.isFinite(numericQuantity)) {
    return "0";
  }

  return Number.isInteger(numericQuantity)
    ? String(numericQuantity)
    : numericQuantity.toFixed(2);
}

function formatTaxRate(basisPoints) {
  const numericBasisPoints = Number(basisPoints);

  if (!Number.isFinite(numericBasisPoints)) {
    return "0.00%";
  }

  return `${(numericBasisPoints / 100).toFixed(2)}%`;
}

function calculateProfitMargin(
  sellingPriceCents,
  costPriceCents,
) {
  const sellingPrice = Number(sellingPriceCents);
  const costPrice = Number(costPriceCents);

  if (
    !Number.isFinite(sellingPrice) ||
    !Number.isFinite(costPrice) ||
    sellingPrice <= 0
  ) {
    return null;
  }

  return (
    ((sellingPrice - costPrice) / sellingPrice) *
    100
  );
}

function ProductDetailsPanel({
  product,
  onClose,
  onEdit,
  onAdjustInventory,
}) {
  if (!product) {
    return null;
  }
const profitMargin = calculateProfitMargin(
  product.selling_price_cents,
  product.cost_price_cents,
);
  const inventoryTrackingLabel = product.track_inventory
    ? "Enabled"
    : "Disabled";

  const inventoryQuantity = product.track_inventory
    ? formatQuantity(product.inventory_quantity)
    : "Not tracked";

  return (
    <>
      <div
        className="product-details-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="product-details-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-title"
      >
        <header className="product-details-header">
          <div>
            <h2 id="product-details-title">Product Details</h2>
            <p>View product information</p>
          </div>

          <button
            type="button"
            className="product-details-close"
            aria-label="Close product details"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <section className="product-details-content">
          <div className="product-details-summary">
            <div className="product-details-summary-text">
              <h3>{product.name}</h3>

              <p>
                {product.category_name || "Uncategorized"}
              </p>
            </div>

            <span
              className={`product-status ${
                product.is_active ? "active" : "inactive"
              }`}
            >
              {product.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="detail-card-stack">
          <DetailCard
            icon={<DollarSign size={18} />}
            title="Pricing"
        >
              <DetailRow
                label="Selling Price"
                value={formatMoney(product.selling_price_cents)}
              />

              <DetailRow
                label="Cost Price"
                value={formatMoney(product.cost_price_cents)}
              />

              <DetailRow
                label="Tax Rate"
                value={formatTaxRate(
                  product.tax_rate_basis_points,
                )}
              />

              <DetailRow
            label="Profit Margin"
            value={<MarginBadge margin={profitMargin} />}
            />

            </DetailCard>

           <DetailCard
            icon={<Package size={18} />}
            title="Inventory"
        >
              <DetailRow
                label="Tracking"
                value={inventoryTrackingLabel}
              />

              <DetailRow
                label="Quantity"
                value={inventoryQuantity}
              />
            </DetailCard>

           <DetailCard
            icon={<Info size={18} />}
            title="Product Information"
        >
              <DetailRow
                label="Category"
                value={
                  product.category_name || "Uncategorized"
                }
              />

              <DetailRow
                label="SKU"
                value={product.sku || "—"}
              />

              <DetailRow
                label="Barcode"
                value={product.barcode || "—"}
              />
            </DetailCard>

            <DetailCard
            icon={<FileText size={18} />}
            title="Description"
        >
              <div className="product-details-description">
                {product.description || "No description provided."}
              </div>
            </DetailCard>
          </div>
        </section>

        <footer className="product-details-footer">
          <button
            type="button"
            className="secondary"
            onClick={() => onAdjustInventory(product)}
            disabled={!product.track_inventory}
          >
            Adjust Inventory
          </button>

          <button
            type="button"
            className="primary"
            onClick={() => onEdit(product)}
          >
            Edit Product
          </button>
        </footer>
      </aside>
    </>
  );
}

export default ProductDetailsPanel;