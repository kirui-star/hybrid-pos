import {
  useEffect,
  useRef,
  useState,
} from "react";

import "./AddProductModal.css";

import {
  categoryService,
} from "../../services/categoryService";

import {
  productService,
} from "../../services/productService";


const emptyForm = {
  name: "",
  categoryId: "",
  barcode: "",
  sku: "",
  description: "",
  sellingPrice: "",
  costPrice: "",

  /*
   * Products are taxable by default.
   *
   * true  = Taxed
   * false = Zero-rated
   */
  isTaxable: true,

  trackInventory: true,
};


function createFormFromProduct(product) {
  if (!product) {
    return {
      ...emptyForm,
    };
  }

  return {
    name:
      product.name ?? "",

    categoryId:
      product.category_id ??
      product.categoryId ??
      "",

    barcode:
      product.barcode ?? "",

    sku:
      product.sku ?? "",

    description:
      product.description ?? "",

    sellingPrice:
      product.selling_price_cents != null
        ? (
            product.selling_price_cents /
            100
          ).toFixed(2)
        : "",

    costPrice:
      product.cost_price_cents != null
        ? (
            product.cost_price_cents /
            100
          ).toFixed(2)
        : "",

    /*
     * SQLite returns 1 or 0.
     *
     * Existing products created before
     * this field was added default to
     * taxable.
     */
    isTaxable:
      product.is_taxable == null
        ? true
        : Boolean(
            product.is_taxable,
          ),

    trackInventory:
      Boolean(
        product.track_inventory,
      ),
  };
}


function moneyToCents(value) {
  const amount =
    Number(value);

  if (
    !Number.isFinite(amount)
  ) {
    return null;
  }

  return Math.round(
    amount * 100,
  );
}


function AddProductModal({
  isOpen,
  product = null,
  onClose,
  onProductCreated,
  onProductUpdated,
}) {
  const isEditing =
    Boolean(product);

  const [form, setForm] =
    useState(emptyForm);

  const [
    categories,
    setCategories,
  ] = useState([]);

  const [
    formError,
    setFormError,
  ] = useState("");

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    isLoadingCategories,
    setIsLoadingCategories,
  ] = useState(false);

  const productNameRef =
    useRef(null);


  /* =========================================
     RESET FORM WHEN MODAL OPENS
  ========================================= */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(
      createFormFromProduct(
        product,
      ),
    );

    setFormError("");

    requestAnimationFrame(() => {
      productNameRef.current?.focus();
    });
  }, [
    isOpen,
    product,
  ]);


  /* =========================================
     LOAD CATEGORIES
  ========================================= */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    async function loadCategories() {
      try {
        setIsLoadingCategories(
          true,
        );

        setFormError("");

        const results =
          await categoryService.getAll();

        setCategories(
          results,
        );

      } catch (error) {
        console.error(
          "Unable to load categories:",
          error,
        );

        setFormError(
          "Categories could not be loaded.",
        );

      } finally {
        setIsLoadingCategories(
          false,
        );
      }
    }

    loadCategories();
  }, [isOpen]);


  if (!isOpen) {
    return null;
  }


  /* =========================================
     UPDATE NORMAL FORM FIELD
  ========================================= */

  function updateField(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm(
      (currentForm) => ({
        ...currentForm,

        [name]:
          type === "checkbox"
            ? checked
            : value,
      }),
    );
  }


  /* =========================================
     UPDATE TAX STATUS
  ========================================= */

  function setTaxStatus(
    isTaxable,
  ) {
    setForm(
      (currentForm) => ({
        ...currentForm,
        isTaxable,
      }),
    );
  }


  /* =========================================
     RESET AND CLOSE
  ========================================= */

  function resetAndClose() {
    if (isSaving) {
      return;
    }

    setForm({
      ...emptyForm,
    });

    setFormError("");

    onClose();
  }


  /* =========================================
     RESET FOR NEXT PRODUCT
  ========================================= */

  function resetForNextProduct() {
    setForm({
      ...emptyForm,
    });

    setFormError("");

    requestAnimationFrame(() => {
      productNameRef.current?.focus();
    });
  }


  /* =========================================
     SUBMIT
  ========================================= */

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();

    setFormError("");

    /*
     * Determines which button was used:
     *
     * save-close
     * add-another
     * update
     */
    const submitAction =
      event.nativeEvent
        ?.submitter
        ?.value ??
      "save-close";


    const sellingPriceCents =
      moneyToCents(
        form.sellingPrice,
      );

    const costPriceCents =
      moneyToCents(
        form.costPrice,
      );


    /* =========================================
       VALIDATION
    ========================================= */

    if (
      !form.name.trim()
    ) {
      setFormError(
        "Product name is required.",
      );

      productNameRef.current?.focus();

      return;
    }


    if (
      sellingPriceCents === null ||
      sellingPriceCents < 0
    ) {
      setFormError(
        "Enter a valid selling price.",
      );

      return;
    }


    if (
      costPriceCents === null ||
      costPriceCents < 0
    ) {
      setFormError(
        "Enter a valid cost price.",
      );

      return;
    }


    /* =========================================
       PRODUCT DATA
    ========================================= */

    const productData = {
      name:
        form.name.trim(),

      categoryId:
        form.categoryId ||
        null,

      barcode:
        form.barcode.trim() ||
        null,

      sku:
        form.sku.trim() ||
        null,

      description:
        form.description.trim() ||
        null,

      sellingPriceCents,

      costPriceCents,

      /*
       * Legacy tax percentage is no
       * longer entered per product.
       *
       * Global VAT comes from
       * store_settings.
       */
      taxRateBasisPoints: 0,

      /*
       * Determines whether the global
       * VAT applies to this product.
       */
      isTaxable:
        form.isTaxable,

      trackInventory:
        form.trackInventory,
    };


    try {
      setIsSaving(true);


      /* =========================================
         EDIT PRODUCT
      ========================================= */

      if (isEditing) {
        const updatedProduct =
          await productService.update(
            product.id,
            productData,
          );

        onProductUpdated?.(
          updatedProduct,
        );

        setForm({
          ...emptyForm,
        });

        onClose();

        return;
      }


      /* =========================================
         ADD PRODUCT
      ========================================= */

      const createdProduct =
        await productService.create(
          productData,
        );

      onProductCreated?.(
        createdProduct,
      );


      /* =========================================
         SAVE & ADD ANOTHER
      ========================================= */

      if (
        submitAction ===
        "add-another"
      ) {
        resetForNextProduct();

        return;
      }


      /* =========================================
         SAVE & CLOSE
      ========================================= */

      setForm({
        ...emptyForm,
      });

      onClose();

    } catch (error) {
      console.error(
        isEditing
          ? "Unable to update product:"
          : "Unable to create product:",
        error,
      );

      setFormError(
        error.message ||
          `The product could not be ${
            isEditing
              ? "updated"
              : "created"
          }.`,
      );

    } finally {
      setIsSaving(false);
    }
  }


  const modalTitle =
    isEditing
      ? "Edit Product"
      : "Add Product";


  const modalDescription =
    isEditing
      ? "Update product information, pricing and settings."
      : "Create a new product for the current store.";


  return (
    <div
      className="product-modal-backdrop"
      onMouseDown={
        resetAndClose
      }
    >
      <section
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >

        {/* =====================================
            HEADER
        ===================================== */}

        <header className="product-modal-header">
          <div>
            <h2 id="product-modal-title">
              {modalTitle}
            </h2>

            <p>
              {modalDescription}
            </p>
          </div>

          <button
            type="button"
            className="product-modal-close"
            onClick={
              resetAndClose
            }
            aria-label="Close"
          >
            ×
          </button>
        </header>


        <form
          onSubmit={
            handleSubmit
          }
        >
          <div className="product-form-grid">

            {/* =================================
                PRODUCT NAME
            ================================= */}

            <label className="product-form-field product-form-field-wide">
              <span>
                Product name *
              </span>

              <input
                ref={
                  productNameRef
                }
                name="name"
                value={
                  form.name
                }
                onChange={
                  updateField
                }
                autoFocus
                required
              />
            </label>


            {/* =================================
                SKU
            ================================= */}

            <label className="product-form-field">
              <span>
                SKU
              </span>

              <input
                name="sku"
                value={
                  form.sku
                }
                onChange={
                  updateField
                }
              />
            </label>


            {/* =================================
                BARCODE
            ================================= */}

            <label className="product-form-field">
              <span>
                Barcode
              </span>

              <input
                name="barcode"
                value={
                  form.barcode
                }
                onChange={
                  updateField
                }
              />
            </label>


            {/* =================================
                CATEGORY
            ================================= */}

            <label className="product-form-field product-form-field-wide">
              <span>
                Category
              </span>

              <select
                name="categoryId"
                value={
                  form.categoryId
                }
                onChange={
                  updateField
                }
                disabled={
                  isLoadingCategories
                }
              >
                <option value="">
                  {isLoadingCategories
                    ? "Loading categories..."
                    : "No category"}
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {category.name}
                    </option>
                  ),
                )}
              </select>
            </label>


            {/* =================================
                SELLING PRICE
            ================================= */}

            <label className="product-form-field">
              <span>
                Selling price *
              </span>

              <div className="money-input">
                <span>
                  Ksh
                </span>

                <input
                  name="sellingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.sellingPrice
                  }
                  onChange={
                    updateField
                  }
                  placeholder="0.00"
                  required
                />
              </div>
            </label>


            {/* =================================
                COST PRICE
            ================================= */}

            <label className="product-form-field">
              <span>
                Cost price *
              </span>

              <div className="money-input">
                <span>
                  Ksh
                </span>

                <input
                  name="costPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.costPrice
                  }
                  onChange={
                    updateField
                  }
                  placeholder="0.00"
                  required
                />
              </div>
            </label>


            {/* =================================
                TAX STATUS
            ================================= */}

            <div className="product-form-field product-form-field-wide">
              <span>
                Tax status
              </span>

              <div className="product-tax-options">

                <button
                  type="button"
                  className={
                    form.isTaxable
                      ? "product-tax-option active"
                      : "product-tax-option"
                  }
                  onClick={() =>
                    setTaxStatus(
                      true,
                    )
                  }
                >
                  <strong>
                    Taxed
                  </strong>

                  <small>
                    16% VAT
                  </small>
                </button>


                <button
                  type="button"
                  className={
                    !form.isTaxable
                      ? "product-tax-option active"
                      : "product-tax-option"
                  }
                  onClick={() =>
                    setTaxStatus(
                      false,
                    )
                  }
                >
                  <strong>
                    Zero-rated
                  </strong>

                  <small>
                    0% VAT
                  </small>
                </button>

              </div>
            </div>


            {/* =================================
                INVENTORY TRACKING
            ================================= */}

            <label className="product-checkbox-field">
              <input
                name="trackInventory"
                type="checkbox"
                checked={
                  form.trackInventory
                }
                onChange={
                  updateField
                }
              />

              <span>
                Track inventory for this product
              </span>
            </label>


            {/* =================================
                DESCRIPTION
            ================================= */}

            <label className="product-form-field product-form-field-wide">
              <span>
                Description
              </span>

              <textarea
                name="description"
                rows="4"
                value={
                  form.description
                }
                onChange={
                  updateField
                }
              />
            </label>

          </div>


          {/* =====================================
              ERROR
          ===================================== */}

          {formError && (
            <div className="product-form-error">
              {formError}
            </div>
          )}


          {/* =====================================
              FOOTER
          ===================================== */}

          <footer className="product-modal-footer">

            <button
              type="button"
              className="secondary-product-button"
              onClick={
                resetAndClose
              }
              disabled={
                isSaving
              }
            >
              Cancel
            </button>


            {isEditing ? (

              <button
                type="submit"
                value="update"
                className="primary-product-button"
                disabled={
                  isSaving
                }
              >
                {isSaving
                  ? "Saving Changes..."
                  : "Save Changes"}
              </button>

            ) : (
              <>
                <button
                  type="submit"
                  value="save-close"
                  className="secondary-product-button save-close-button"
                  disabled={
                    isSaving
                  }
                >
                  {isSaving
                    ? "Saving..."
                    : "Save & Close"}
                </button>

                <button
                  type="submit"
                  value="add-another"
                  className="primary-product-button"
                  disabled={
                    isSaving
                  }
                >
                  {isSaving
                    ? "Saving..."
                    : "Save & Add Another"}
                </button>
              </>
            )}

          </footer>
        </form>

      </section>
    </div>
  );
}


export default AddProductModal;