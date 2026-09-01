import {
  Search,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./ProductLookupModal.css";

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

function ProductLookupModal({
  isOpen,
  products,
  onClose,
  onSelectProduct,
}) {
  const [searchText, setSearchText] =
    useState("");

  const [selectedIndex, setSelectedIndex] =
    useState(0);

  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSearchText("");
    setSelectedIndex(0);

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchText
      .trim()
      .toLowerCase();

    const activeProducts = products.filter(
      (product) => Boolean(product.is_active),
    );

    if (!normalizedSearch) {
      return activeProducts.slice(0, 12);
    }

    return activeProducts
      .filter((product) => {
        const productName = String(
          product.name ?? "",
        ).toLowerCase();

        const categoryName = String(
          product.category_name ?? "",
        ).toLowerCase();

        const sku = String(
          product.sku ?? "",
        ).toLowerCase();

        const barcode = String(
          product.barcode ?? "",
        ).toLowerCase();

        return (
          productName.includes(normalizedSearch) ||
          categoryName.includes(normalizedSearch) ||
          sku.includes(normalizedSearch) ||
          barcode.includes(normalizedSearch)
        );
      })
      .slice(0, 20);
  }, [products, searchText]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchText]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (
        event.key === "ArrowDown" &&
        filteredProducts.length > 0
      ) {
        event.preventDefault();

        setSelectedIndex((currentIndex) =>
          Math.min(
            currentIndex + 1,
            filteredProducts.length - 1,
          ),
        );

        return;
      }

      if (
        event.key === "ArrowUp" &&
        filteredProducts.length > 0
      ) {
        event.preventDefault();

        setSelectedIndex((currentIndex) =>
          Math.max(currentIndex - 1, 0),
        );

        return;
      }

      if (
        event.key === "Enter" &&
        filteredProducts.length > 0
      ) {
        event.preventDefault();

        const selectedProduct =
          filteredProducts[selectedIndex];

        if (selectedProduct) {
          onSelectProduct(selectedProduct);
        }
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    filteredProducts,
    isOpen,
    onClose,
    onSelectProduct,
    selectedIndex,
  ]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="product-lookup-backdrop"
      onMouseDown={onClose}
    >
      <section
        className="product-lookup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-lookup-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className="product-lookup-header">
          <div>
            <h2 id="product-lookup-title">
              Look up an item
            </h2>

            <p>
              Search by product name, category, SKU,
              or barcode.
            </p>
          </div>

          <button
            type="button"
            className="product-lookup-close"
            onClick={onClose}
            aria-label="Close product lookup"
          >
            <X size={20} />
          </button>
        </header>

        <div className="product-lookup-search">
          <Search size={21} />

          <input
            ref={searchInputRef}
            type="search"
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            placeholder="Start typing to find an item"
            aria-label="Search products"
          />
        </div>

        <div className="product-lookup-help">
          <span>
            Use ↑ and ↓ to move
          </span>

          <span>
            Enter to add
          </span>

          <span>
            Esc to close
          </span>
        </div>

        <div className="product-lookup-results">
          {filteredProducts.length === 0 ? (
            <div className="product-lookup-empty">
              <Search size={32} />

              <strong>
                No matching products
              </strong>

              <span>
                Try another product name, category,
                SKU, or barcode.
              </span>
            </div>
          ) : (
            filteredProducts.map(
              (product, index) => {
                const inventoryQuantity = Number(
                  product.inventory_quantity ?? 0,
                );

                const isOutOfStock =
                  Boolean(product.track_inventory) &&
                  inventoryQuantity <= 0;

                const isSelected =
                  index === selectedIndex;

                return (
                  <button
                    key={product.id}
                    type="button"
                    className={`product-lookup-result ${
                      isSelected ? "selected" : ""
                    }`}
                    onMouseEnter={() =>
                      setSelectedIndex(index)
                    }
                    onClick={() =>
                      onSelectProduct(product)
                    }
                    disabled={isOutOfStock}
                  >
                    <div className="product-lookup-product">
                      <strong>
                        {product.name}
                      </strong>

                      <span>
                        {product.category_name ||
                          "Uncategorized"}

                        {product.sku
                          ? ` · SKU ${product.sku}`
                          : ""}
                      </span>

                      {product.barcode && (
                        <small>
                          Barcode: {product.barcode}
                        </small>
                      )}
                    </div>

                    <div className="product-lookup-details">
                      <strong>
                        {formatMoney(
                          product.selling_price_cents,
                        )}
                      </strong>

                      <span
                        className={
                          isOutOfStock
                            ? "out-of-stock"
                            : ""
                        }
                      >
                        {!product.track_inventory
                          ? "Available"
                          : isOutOfStock
                            ? "Out of stock"
                            : `${inventoryQuantity} in stock`}
                      </span>
                    </div>
                  </button>
                );
              },
            )
          )}
        </div>
      </section>
    </div>
  );
}

export default ProductLookupModal;