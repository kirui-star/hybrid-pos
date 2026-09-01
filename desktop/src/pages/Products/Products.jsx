import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  productService,
} from "../../services/productService";

import "./Products.css";

import AddProductModal from "./AddProductModal";
import ProductDetailsPanel from "./ProductDetailsPanel";
import AdjustInventoryModal from "./AdjustInventoryModal";


/* ===========================================
   FORMAT MONEY
=========================================== */

function formatMoney(cents) {
  const numericCents =
    Number(cents);

  if (
    !Number.isFinite(
      numericCents,
    )
  ) {
    return "$0.00";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    },
  ).format(
    numericCents / 100,
  );
}


/* ===========================================
   FORMAT QUANTITY
=========================================== */

function formatQuantity(quantity) {
  const numericQuantity =
    Number(quantity);

  if (
    !Number.isFinite(
      numericQuantity,
    )
  ) {
    return "0";
  }

  return Number.isInteger(
    numericQuantity,
  )
    ? String(
        numericQuantity,
      )
    : numericQuantity.toFixed(
        2,
      );
}


/* ===========================================
   PRODUCTS
=========================================== */

function Products({
  onBackToDashboard,
  onLogout,
  embedded = false,
}) {

  /* =========================================
     STATE
  ========================================= */

  const [
    products,
    setProducts,
  ] = useState([]);


  const [
    searchText,
    setSearchText,
  ] = useState("");


  const [
    isLoading,
    setIsLoading,
  ] = useState(true);


  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");


  const [
    isAddModalOpen,
    setIsAddModalOpen,
  ] = useState(false);


  const [
    editingProduct,
    setEditingProduct,
  ] = useState(null);


  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);


  const [
    actionMenuPosition,
    setActionMenuPosition,
  ] = useState(null);


  const [
    openActionMenuId,
    setOpenActionMenuId,
  ] = useState(null);


  const [
    inventoryAdjustmentProduct,
    setInventoryAdjustmentProduct,
  ] = useState(null);
const [
  deleteProductTarget,
  setDeleteProductTarget,
] = useState(null);


const [
  isDeletingProduct,
  setIsDeletingProduct,
] = useState(false);


const [
  deleteProductError,
  setDeleteProductError,
] = useState("");

  /* =========================================
     LOAD PRODUCTS
  ========================================= */

  useEffect(() => {

    async function loadProducts() {
      try {

        setIsLoading(
          true,
        );

        setErrorMessage(
          "",
        );


        const databaseProducts =
          await productService.getAll();


        setProducts(
          Array.isArray(
            databaseProducts,
          )
            ? databaseProducts
            : [],
        );

      } catch (error) {

        console.error(
          "Unable to load products:",
          error,
        );


        setErrorMessage(
          error?.message ||
            "Products could not be loaded. Please restart the application.",
        );

      } finally {

        setIsLoading(
          false,
        );
      }
    }


    loadProducts();

  }, []);


  /* =========================================
     CLOSE ACTION MENU
  ========================================= */

  function closeActionMenu() {
    setOpenActionMenuId(
      null,
    );

    setActionMenuPosition(
      null,
    );
  }


  /* =========================================
     PRODUCT CREATED
  ========================================= */

  function handleProductCreated(
    createdProduct,
  ) {

    setProducts(
      (
        currentProducts,
      ) =>
        [
          ...currentProducts,
          createdProduct,
        ].sort(
          (
            firstProduct,
            secondProduct,
          ) =>
            firstProduct.name.localeCompare(
              secondProduct.name,
            ),
        ),
    );
  }


  /* =========================================
     PRODUCT UPDATED
  ========================================= */

  function handleProductUpdated(
    updatedProduct,
  ) {

    setProducts(
      (
        currentProducts,
      ) =>
        currentProducts
          .map(
            (
              product,
            ) =>
              product.id ===
              updatedProduct.id
                ? updatedProduct
                : product,
          )
          .sort(
            (
              firstProduct,
              secondProduct,
            ) =>
              firstProduct.name.localeCompare(
                secondProduct.name,
              ),
          ),
    );


    setSelectedProduct(
      (
        currentProduct,
      ) => {

        if (
          currentProduct?.id !==
          updatedProduct.id
        ) {
          return currentProduct;
        }

        return updatedProduct;
      },
    );


    setEditingProduct(
      null,
    );
  }


  /* =========================================
     OPEN ADD PRODUCT
  ========================================= */

  function openAddProductModal() {

    closeActionMenu();

    setSelectedProduct(
      null,
    );

    setEditingProduct(
      null,
    );

    setInventoryAdjustmentProduct(
      null,
    );

    setIsAddModalOpen(
      true,
    );
  }


  /* =========================================
     OPEN EDIT PRODUCT
  ========================================= */

  function openEditProductModal(
    product,
  ) {

    closeActionMenu();

    setSelectedProduct(
      null,
    );

    setInventoryAdjustmentProduct(
      null,
    );

    setIsAddModalOpen(
      false,
    );

    setEditingProduct(
      product,
    );
  }


  /* =========================================
     ACTION MENU POSITION
  ========================================= */

  function toggleActionMenu(
    productId,
    buttonElement,
  ) {

    if (
      openActionMenuId ===
      productId
    ) {

      closeActionMenu();

      return;
    }


    const rect =
      buttonElement
        .getBoundingClientRect();


    const menuWidth =
      220;

    const menuHeight =
      184;

    const gap =
      8;

    const viewportPadding =
      12;


    /* -----------------------------------------
       VERTICAL POSITION
    ----------------------------------------- */

    let top =
      rect.bottom +
      gap;


    const spaceBelow =
      window.innerHeight -
      rect.bottom;


    if (
      spaceBelow <
      menuHeight +
        gap
    ) {

      top =
        rect.top -
        menuHeight -
        gap;
    }


    if (
      top <
      viewportPadding
    ) {

      top =
        viewportPadding;
    }


    const bottomLimit =
      window.innerHeight -
      menuHeight -
      viewportPadding;


    if (
      top >
      bottomLimit
    ) {

      top =
        Math.max(
          viewportPadding,
          bottomLimit,
        );
    }


    /* -----------------------------------------
       HORIZONTAL POSITION

       Prefer LEFT of the ⋮ button.
    ----------------------------------------- */

    let left =
      rect.left -
      menuWidth -
      gap;


    /*
     * If there is not enough room
     * on the left, try the right.
     */

    if (
      left <
      viewportPadding
    ) {

      left =
        rect.right +
        gap;
    }


    /*
     * Never let the menu leave
     * the right side of the window.
     */

    const rightLimit =
      window.innerWidth -
      menuWidth -
      viewportPadding;


    if (
      left >
      rightLimit
    ) {

      left =
        rightLimit;
    }


    /*
     * Final left-edge protection.
     */

    if (
      left <
      viewportPadding
    ) {

      left =
        viewportPadding;
    }


    setActionMenuPosition({
      top,
      left,
    });


    setOpenActionMenuId(
      productId,
    );
  }


  /* =========================================
     DEACTIVATE PRODUCT
  ========================================= */

  async function handleDeactivateProduct(
    product,
  ) {

    if (
      !product?.id
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Deactivate "${product.name}"?\n\nThis product will no longer appear in checkout or active product lists.`,
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      const deactivatedProduct =
        await productService.deactivate(
          product.id,
        );


      setProducts(
        (
          currentProducts,
        ) =>
          currentProducts.map(
            (
              currentProduct,
            ) =>
              currentProduct.id ===
              deactivatedProduct.id
                ? deactivatedProduct
                : currentProduct,
          ),
      );


      setSelectedProduct(
        (
          currentProduct,
        ) =>
          currentProduct?.id ===
          deactivatedProduct.id
            ? deactivatedProduct
            : currentProduct,
      );


      closeActionMenu();

    } catch (error) {

      console.error(
        "Unable to deactivate product:",
        error,
      );


      window.alert(
        error?.message ||
          "The product could not be deactivated.",
      );
    }
  }


  /* =========================================
     ACTIVATE PRODUCT
  ========================================= */

  async function handleActivateProduct(
    product,
  ) {

    if (
      !product?.id
    ) {
      return;
    }


    try {

      const activatedProduct =
        await productService.activate(
          product.id,
        );


      setProducts(
        (
          currentProducts,
        ) =>
          currentProducts.map(
            (
              currentProduct,
            ) =>
              currentProduct.id ===
              activatedProduct.id
                ? activatedProduct
                : currentProduct,
          ),
      );


      setSelectedProduct(
        (
          currentProduct,
        ) =>
          currentProduct?.id ===
          activatedProduct.id
            ? activatedProduct
            : currentProduct,
      );


      closeActionMenu();

    } catch (error) {

      console.error(
        "Unable to activate product:",
        error,
      );


      window.alert(
        error?.message ||
          "The product could not be activated.",
      );
    }
  }


  /* =========================================
   OPEN DELETE PRODUCT
========================================= */

function openDeleteProductConfirmation(
  product,
) {
  if (!product?.id) {
    return;
  }


  closeActionMenu();


  setSelectedProduct(
    null,
  );


  setEditingProduct(
    null,
  );


  setInventoryAdjustmentProduct(
    null,
  );


  setDeleteProductError(
    "",
  );


  setDeleteProductTarget(
    product,
  );
}


/* =========================================
   CLOSE DELETE PRODUCT
========================================= */

function closeDeleteProductConfirmation() {
  if (
    isDeletingProduct
  ) {
    return;
  }


  setDeleteProductTarget(
    null,
  );


  setDeleteProductError(
    "",
  );
}


/* =========================================
   DELETE PRODUCT
========================================= */

async function handleDeleteProduct() {

  if (
    !deleteProductTarget?.id ||
    isDeletingProduct
  ) {
    return;
  }


  try {

    setIsDeletingProduct(
      true,
    );


    setDeleteProductError(
      "",
    );


    const result =
      await window.api
        .deleteProduct(
          deleteProductTarget.id,
        );


    /* =====================================
       PERMANENTLY DELETED
    ===================================== */

    if (
      result?.action ===
      "DELETED"
    ) {

      setProducts(
        (
          currentProducts,
        ) =>
          currentProducts.filter(
            (
              product,
            ) =>
              product.id !==
              deleteProductTarget.id,
          ),
      );


      setSelectedProduct(
        (
          currentProduct,
        ) =>
          currentProduct?.id ===
          deleteProductTarget.id
            ? null
            : currentProduct,
      );


      setDeleteProductTarget(
        null,
      );


      window.alert(
        result?.message ||
        "Product deleted successfully.",
      );


      return;
    }


    /* =====================================
       PRODUCT HAD HISTORY
       -> DEACTIVATED
    ===================================== */

    if (
      result?.action ===
        "DEACTIVATED" &&
      result?.product
    ) {

      const updatedProduct =
        result.product;


      setProducts(
        (
          currentProducts,
        ) =>
          currentProducts.map(
            (
              product,
            ) =>
              product.id ===
              updatedProduct.id
                ? updatedProduct
                : product,
          ),
      );


      setSelectedProduct(
        (
          currentProduct,
        ) =>
          currentProduct?.id ===
          updatedProduct.id
            ? updatedProduct
            : currentProduct,
      );


      setDeleteProductTarget(
        null,
      );


      window.alert(
        result?.message ||
        "Product has transaction history and was deactivated instead.",
      );


      return;
    }


    throw new Error(
      "Unexpected delete response.",
    );


  } catch (error) {

    console.error(
      "Unable to delete product:",
      error,
    );


    setDeleteProductError(
      error?.message ||
      "The product could not be deleted.",
    );


  } finally {

    setIsDeletingProduct(
      false,
    );
  }
}

  /* =========================================
     PRODUCT ACTION
  ========================================= */

  function handleProductAction(
    action,
    product,
  ) {

    closeActionMenu();


    switch (action) {

      case "Edit":

        openEditProductModal(
          product,
        );

        break;


      case "Adjust Inventory":

        setSelectedProduct(
          null,
        );

        setEditingProduct(
          null,
        );

        setInventoryAdjustmentProduct(
          product,
        );

        break;


      case "Deactivate":

        handleDeactivateProduct(
          product,
        );

        break;


      case "Activate":

        handleActivateProduct(
          product,
        );

        break;


     case "Delete":

  openDeleteProductConfirmation(
    product,
  );

  break;


      default:

        break;
    }
  }


  /* =========================================
     FILTER PRODUCTS
  ========================================= */

  const filteredProducts =
    useMemo(
      () => {

        const search =
          searchText
            .trim()
            .toLowerCase();


        if (
          !search
        ) {

          return products;
        }


        return products.filter(
          (
            product,
          ) => {

            return (

              product.name
                ?.toLowerCase()
                .includes(
                  search,
                ) ||

              product.category_name
                ?.toLowerCase()
                .includes(
                  search,
                ) ||

              product.sku
                ?.toLowerCase()
                .includes(
                  search,
                ) ||

              product.barcode
                ?.toLowerCase()
                .includes(
                  search,
                )

            );
          },
        );
      },
      [
        products,
        searchText,
      ],
    );


  /* =========================================
     RENDER
  ========================================= */

  return (
    <div
      className={
        embedded
          ? "products-page products-page-embedded"
          : "products-page"
      }
    >

      {/* =====================================
          SIDEBAR
      ===================================== */}

      {!embedded && (

        <aside className="products-sidebar">

          <div>

            <h1>
              Hybrid POS
            </h1>

            <p>
              Retail Management
            </p>

          </div>


          <nav>

            <button
              type="button"
              onClick={
                onBackToDashboard
              }
            >
              Dashboard
            </button>


            <button
              type="button"
              className="active"
            >
              Products
            </button>


            <button
              type="button"
              onClick={
                openAddProductModal
              }
            >
              Add Product
            </button>

          </nav>


          <button
            type="button"
            className="products-logout-button"
            onClick={
              onLogout
            }
          >
            Logout
          </button>

        </aside>

      )}


      {/* =====================================
          CONTENT
      ===================================== */}

      <main className="products-content">

        {/* ===================================
            PAGE HEADER
        =================================== */}

        {!embedded && (

          <header className="products-header">

            <div className="products-title-group">

              <h2>
                Products
              </h2>

              <p>
                Manage products, prices and inventory.
              </p>

            </div>


            <button
              type="button"
              className="add-product-button"
              onClick={
                openAddProductModal
              }
            >

              <span className="add-product-icon">
                +
              </span>

              Add Product

            </button>

          </header>

        )}


        {/* ===================================
            TOOLBAR
        =================================== */}

        <section className="products-toolbar">

          <div className="products-search-wrapper">

            <span className="products-search-icon">
              ⌕
            </span>


            <input
              type="search"
              placeholder="Search by product name, category, SKU, or barcode"
              value={
                searchText
              }
              onChange={
                (
                  event,
                ) =>
                  setSearchText(
                    event.target.value,
                  )
              }
            />

          </div>


          <div className="products-toolbar-actions">

            <div className="products-count">

              <strong>
                {
                  filteredProducts.length
                }
              </strong>


              <span>
                Product
                {
                  filteredProducts.length ===
                  1
                    ? ""
                    : "s"
                }
              </span>

            </div>


            {embedded && (

              <button
                type="button"
                className="add-product-button"
                onClick={
                  openAddProductModal
                }
              >

                <span className="add-product-icon">
                  +
                </span>

                Add Product

              </button>

            )}

          </div>

        </section>


        {/* ===================================
            PRODUCTS TABLE
        =================================== */}

        <section className="products-table-card">

          {isLoading && (

            <div className="products-status">
              Loading products...
            </div>

          )}


          {!isLoading &&
            errorMessage && (

              <div className="products-status products-error">
                {
                  errorMessage
                }
              </div>

            )}


          {!isLoading &&
            !errorMessage &&
            filteredProducts.length ===
              0 && (

              <div className="products-status">
                No matching products were found.
              </div>

            )}


          {!isLoading &&
            !errorMessage &&
            filteredProducts.length >
              0 && (

              <div className="products-table-wrapper">

                <table
                  className={
                    embedded
                      ? "products-table embedded-products-table"
                      : "products-table"
                  }
                >

                  <thead>

                    <tr>

                      <th>
                        Product
                      </th>

                      <th>
                        Price
                      </th>

                      <th>
                        Inventory
                      </th>

                      <th>
                        Status
                      </th>

                      <th
                        aria-label="Actions"
                      />

                    </tr>

                  </thead>


                  <tbody>

                    {filteredProducts.map(
                      (
                        product,
                      ) => (

                        <tr
  key={product.id}
  className={`product-row ${
    product.is_active
      ? ""
      : "inactive-row"
  } ${
    openActionMenuId === product.id
      ? "action-row-selected"
      : ""
  }`}
                        >

                          {/* PRODUCT */}

                          <td>

                            <div className="product-name-block">

                              <strong>
                                {
                                  product.name
                                }
                              </strong>

                              <span>
                                {
                                  product.description ||
                                  "No description"
                                }
                              </span>

                            </div>

                          </td>


                          {/* PRICE */}

                          <td>

                            <strong className="product-price">

                              {
                                formatMoney(
                                  product
                                    .selling_price_cents,
                                )
                              }

                            </strong>


                            <span className="product-cost">

                              Cost{" "}

                              {
                                formatMoney(
                                  product
                                    .cost_price_cents,
                                )
                              }

                            </span>

                          </td>


                          {/* INVENTORY */}

                          <td>

                            {product.track_inventory ? (

                              <div className="inventory-cell">

                                <strong>

                                  {
                                    formatQuantity(
                                      product
                                        .inventory_quantity,
                                    )
                                  }

                                </strong>


                                <span>
                                  In stock
                                </span>

                              </div>

                            ) : (

                              <span className="inventory-not-tracked">
                                Not tracked
                              </span>

                            )}

                          </td>


                          {/* STATUS */}

                          <td>

                            <span
                              className={`product-status ${
                                product.is_active
                                  ? "active"
                                  : "inactive"
                              }`}
                            >

                              {
                                product.is_active
                                  ? "Active"
                                  : "Inactive"
                              }

                            </span>

                          </td>


                          {/* ACTIONS */}

                          <td className="product-actions-cell">

                            <div className="product-actions">

                              <button
                                type="button"
                                className="product-actions-trigger"
                                aria-label={`Open actions for ${product.name}`}
                                aria-expanded={
                                  openActionMenuId ===
                                  product.id
                                }
                                onClick={
                                  (
                                    event,
                                  ) => {

                                    event.stopPropagation();


                                    toggleActionMenu(
                                      product.id,
                                      event.currentTarget,
                                    );

                                  }
                                }
                              >
                                ⋮
                              </button>


                              {openActionMenuId ===
                                product.id &&
                                actionMenuPosition &&
                                createPortal(

                                  <div
                                    className="product-actions-menu product-actions-menu-portal"
                                    style={{
                                      top:
                                        `${actionMenuPosition.top}px`,

                                      left:
                                        `${actionMenuPosition.left}px`,
                                    }}
                                    onClick={
                                      (
                                        event,
                                      ) =>
                                        event.stopPropagation()
                                    }
                                  >

                                    <button
                                      type="button"
                                      onClick={
                                        (
                                          event,
                                        ) => {

                                          event.stopPropagation();


                                          handleProductAction(
                                            "Edit",
                                            product,
                                          );

                                        }
                                      }
                                    >
                                      ✏️ Edit Product
                                    </button>


                                    <button
                                      type="button"
                                      onClick={
                                        (
                                          event,
                                        ) => {

                                          event.stopPropagation();


                                          handleProductAction(
                                            "Adjust Inventory",
                                            product,
                                          );

                                        }
                                      }
                                    >
                                      📦 Adjust Inventory
                                    </button>


                                    <div className="product-actions-divider" />


                                    <button
                                      type="button"
                                      onClick={
                                        (
                                          event,
                                        ) => {

                                          event.stopPropagation();


                                          handleProductAction(
                                            product.is_active
                                              ? "Deactivate"
                                              : "Activate",
                                            product,
                                          );

                                        }
                                      }
                                    >

                                      {
                                        product.is_active
                                          ? "⏸ Deactivate Product"
                                          : "▶ Activate Product"
                                      }

                                    </button>


                                    <button
                                      type="button"
                                      className="danger"
                                      onClick={
                                        (
                                          event,
                                        ) => {

                                          event.stopPropagation();


                                          handleProductAction(
                                            "Delete",
                                            product,
                                          );

                                        }
                                      }
                                    >
                                      🗑 Delete Product
                                    </button>

                                  </div>,

                                  document.body,

                                )}

                            </div>

                          </td>

                        </tr>

                      ),
                    )}

                  </tbody>

                </table>

              </div>

            )}

        </section>

      </main>


      {/* =====================================
          ADD PRODUCT MODAL
      ===================================== */}

      <AddProductModal
        isOpen={
          isAddModalOpen
        }
        product={
          null
        }
        onClose={() =>
          setIsAddModalOpen(
            false,
          )
        }
        onProductCreated={
          handleProductCreated
        }
      />


      {/* =====================================
          EDIT PRODUCT MODAL
      ===================================== */}

      <AddProductModal
        isOpen={
          Boolean(
            editingProduct,
          )
        }
        product={
          editingProduct
        }
        onClose={() =>
          setEditingProduct(
            null,
          )
        }
        onProductUpdated={
          handleProductUpdated
        }
      />


      {/* =====================================
          ADJUST INVENTORY MODAL
      ===================================== */}

      <AdjustInventoryModal
        isOpen={
          Boolean(
            inventoryAdjustmentProduct,
          )
        }
        product={
          inventoryAdjustmentProduct
        }
        onClose={() =>
          setInventoryAdjustmentProduct(
            null,
          )
        }
        onInventoryAdjusted={
          (
            updatedProduct,
          ) => {

            setProducts(
              (
                currentProducts,
              ) =>
                currentProducts.map(
                  (
                    product,
                  ) =>
                    product.id ===
                    updatedProduct.id
                      ? updatedProduct
                      : product,
                ),
            );


            setSelectedProduct(
              (
                currentProduct,
              ) =>
                currentProduct?.id ===
                updatedProduct.id
                  ? updatedProduct
                  : currentProduct,
            );


            setInventoryAdjustmentProduct(
              null,
            );

          }
        }
      />


{/* =====================================
    DELETE PRODUCT CONFIRMATION
===================================== */}

{
  deleteProductTarget && (

    <div
      className="delete-product-backdrop"
      onMouseDown={
        (event) => {

          if (
            event.target ===
              event.currentTarget &&
            !isDeletingProduct
          ) {
            closeDeleteProductConfirmation();
          }
        }
      }
    >

      <div
        className="delete-product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-product-title"
      >

        {/* HEADER */}

        <div
          className="delete-product-header"
        >
          <div
            className="delete-product-warning-icon"
          >
            !
          </div>


          <div>
            <h2
              id="delete-product-title"
            >
              Delete Product?
            </h2>

            <p>
              {
                deleteProductTarget.name
              }
            </p>
          </div>
        </div>


        {/* BODY */}

        <div
          className="delete-product-body"
        >

          <p>
            If this product has no transaction
            history, it will be permanently
            deleted.
          </p>


          <div
            className="delete-product-history-note"
          >
            <strong>
              Products with transaction history
              will not be permanently deleted.
            </strong>

            <span>
              If sales, purchases, or inventory
              history exists, the product will
              instead be deactivated so your
              financial and inventory records
              remain accurate.
            </span>
          </div>


          {
            deleteProductTarget
              .track_inventory &&
            Number(
              deleteProductTarget
                .inventory_quantity ??
              0,
            ) !== 0 && (

              <div
                className="delete-product-stock-warning"
              >
                Current stock:{" "}
                <strong>
                  {
                    formatQuantity(
                      deleteProductTarget
                        .inventory_quantity,
                    )
                  }
                </strong>

                <span>
                  This product currently has an
                  inventory balance.
                </span>
              </div>
            )
          }


          {
            deleteProductError && (

              <div
                className="delete-product-error"
              >
                {
                  deleteProductError
                }
              </div>
            )
          }

        </div>


        {/* FOOTER */}

        <div
          className="delete-product-footer"
        >

          <button
            type="button"
            className="delete-product-cancel"
            onClick={
              closeDeleteProductConfirmation
            }
            disabled={
              isDeletingProduct
            }
          >
            Cancel
          </button>


          <button
            type="button"
            className="delete-product-confirm"
            onClick={
              handleDeleteProduct
            }
            disabled={
              isDeletingProduct
            }
          >
            {
              isDeletingProduct
                ? "Deleting..."
                : "Delete Product"
            }
          </button>

        </div>

      </div>

    </div>
  )
}

      {/* =====================================
          PRODUCT DETAILS PANEL
      ===================================== */}

      <ProductDetailsPanel
        product={
          selectedProduct
        }
        onClose={() =>
          setSelectedProduct(
            null,
          )
        }
        onEdit={
          (
            product,
          ) =>
            openEditProductModal(
              product,
            )
        }
        onAdjustInventory={
          (
            product,
          ) =>
            handleProductAction(
              "Adjust Inventory",
              product,
            )
        }
      />

    </div>
  );
}


export default Products;