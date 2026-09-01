import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./ReceiveStockModal.css";


const PAYMENT_METHODS = [
  {
    value: "CASH",
    label: "Cash",
  },
  {
    value: "MPESA",
    label: "M-Pesa",
  },
  {
    value: "BANK",
    label: "Bank",
  },
  {
    value: "CREDIT",
    label: "Credit / Pay Later",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];


const DISCOUNT_TYPES = [
  {
    value: "NONE",
    label: "No Discount",
  },
  {
    value: "PERCENT",
    label: "Percentage",
  },
  {
    value: "FIXED",
    label: "Fixed Amount",
  },
];


function formatMoneyFromCents(
  cents,
) {
  const value =
    Number(cents ?? 0) /
    100;

  return new Intl.NumberFormat(
    "en-KE",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(
    value,
  );
}


function moneyInputToCents(
  value,
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.round(
    number * 100,
  );
}


function ReceiveStockModal({
  isOpen,
  onClose,
  onStockReceived,
}) {

  const searchInputRef =
    useRef(null);


  const [
    products,
    setProducts,
  ] = useState([]);


  const [
    loadingProducts,
    setLoadingProducts,
  ] = useState(false);


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);


  const [
    quantity,
    setQuantity,
  ] = useState("");


  const [
    supplierUnitCost,
    setSupplierUnitCost,
  ] = useState("");


  const [
    newSellingPrice,
    setNewSellingPrice,
  ] = useState("");


  const [
    discountType,
    setDiscountType,
  ] = useState("NONE");


  const [
    discountValue,
    setDiscountValue,
  ] = useState("");


  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("CASH");


  const [
    supplierName,
    setSupplierName,
  ] = useState("");


  const [
    referenceNumber,
    setReferenceNumber,
  ] = useState("");


  const [
    notes,
    setNotes,
  ] = useState("");


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    successResult,
    setSuccessResult,
  ] = useState(null);


  /* =========================================
     LOAD PRODUCTS
  ========================================= */

  async function loadProducts() {
    try {
      setLoadingProducts(
        true,
      );

      const result =
        await window.api
          .getProducts();

      setProducts(
        Array.isArray(result)
          ? result
          : [],
      );

    } catch (loadError) {
      console.error(
        "Unable to load products:",
        loadError,
      );

      setError(
        loadError?.message ||
        "Unable to load products.",
      );

    } finally {
      setLoadingProducts(
        false,
      );
    }
  }


  /* =========================================
     OPEN MODAL
  ========================================= */

  useEffect(
    () => {
      if (!isOpen) {
        return;
      }

      setError(
        "",
      );

      setSuccessResult(
        null,
      );

      loadProducts();

      window.setTimeout(
        () => {
          searchInputRef
            .current
            ?.focus();
        },
        100,
      );
    },
    [
      isOpen,
    ],
  );


  /* =========================================
     ESC KEY
  ========================================= */

  useEffect(
    () => {
      if (!isOpen) {
        return undefined;
      }


      function handleKeyDown(
        event,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          onClose?.();
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
    },
    [
      isOpen,
      onClose,
    ],
  );


  /* =========================================
     SEARCH RESULTS
  ========================================= */

  const filteredProducts =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();


        if (!query) {
          return products
            .slice(
              0,
              6,
            );
        }


        return products
          .filter(
            (product) => {
              const name =
                String(
                  product.name ??
                  "",
                )
                  .toLowerCase();


              const sku =
                String(
                  product.sku ??
                  "",
                )
                  .toLowerCase();


              const barcode =
                String(
                  product.barcode ??
                  "",
                )
                  .toLowerCase();


              return (
                name.includes(
                  query,
                ) ||
                sku.includes(
                  query,
                ) ||
                barcode.includes(
                  query,
                )
              );
            },
          )
          .slice(
            0,
            8,
          );
      },
      [
        products,
        search,
      ],
    );


  /* =========================================
     SELECT PRODUCT
  ========================================= */

  function selectProduct(
    product,
  ) {
    if (
      !product
        ?.track_inventory
    ) {
      setError(
        "This product does not track inventory.",
      );

      return;
    }


    setSelectedProduct(
      product,
    );


    setQuantity(
      "",
    );


    setSupplierUnitCost(
      (
        Number(
          product
            .cost_price_cents ??
          0,
        ) /
        100
      ).toFixed(
        2,
      ),
    );


    setNewSellingPrice(
      (
        Number(
          product
            .selling_price_cents ??
          0,
        ) /
        100
      ).toFixed(
        2,
      ),
    );


    setDiscountType(
      "NONE",
    );


    setDiscountValue(
      "",
    );


    setError(
      "",
    );


    setSuccessResult(
      null,
    );


    setSearch(
      product.name ??
      "",
    );
  }


  /* =========================================
     BARCODE / ENTER
  ========================================= */

  function handleSearchKeyDown(
    event,
  ) {
    if (
      event.key !==
      "Enter"
    ) {
      return;
    }


    event.preventDefault();


    const query =
      search
        .trim()
        .toLowerCase();


    if (!query) {
      return;
    }


    const exactBarcode =
      products.find(
        (product) =>
          String(
            product.barcode ??
            "",
          )
            .trim()
            .toLowerCase() ===
          query,
      );


    if (exactBarcode) {
      selectProduct(
        exactBarcode,
      );

      return;
    }


    if (
      filteredProducts.length >
      0
    ) {
      selectProduct(
        filteredProducts[0],
      );
    }
  }


  /* =========================================
     LIVE CALCULATIONS
  ========================================= */

  const preview =
    useMemo(
      () => {

        if (!selectedProduct) {
          return {
            previousQuantity: 0,

            receivedQuantity: 0,

            resultingQuantity: 0,

            oldCostCents: 0,

            supplierUnitCostCents: 0,

            grossCostCents: 0,

            discountCents: 0,

            netCostCents: 0,

            effectiveUnitCostCents: 0,

            averageCostCents: 0,

            previousInventoryValueCents: 0,

            resultingInventoryValueCents: 0,
          };
        }


        const previousQuantity =
          Number(
            selectedProduct
              .inventory_quantity ??
            0,
          );


        const receivedQuantity =
          Math.max(
            Number(
              quantity,
            ) ||
            0,
            0,
          );


        const resultingQuantity =
          previousQuantity +
          receivedQuantity;


        const oldCostCents =
          Number(
            selectedProduct
              .cost_price_cents ??
            0,
          );


        const supplierUnitCostCents =
          moneyInputToCents(
            supplierUnitCost,
          );


        const grossCostCents =
          Math.round(
            receivedQuantity *
            supplierUnitCostCents,
          );


        let calculatedDiscountCents =
          0;


        if (
          discountType ===
          "PERCENT"
        ) {
          const percentage =
            Math.max(
              Number(
                discountValue,
              ) ||
              0,
              0,
            );


          calculatedDiscountCents =
            Math.round(
              grossCostCents *
              (
                percentage /
                100
              ),
            );
        }


        if (
          discountType ===
          "FIXED"
        ) {
          calculatedDiscountCents =
            moneyInputToCents(
              discountValue,
            );
        }


        calculatedDiscountCents =
          Math.min(
            calculatedDiscountCents,
            grossCostCents,
          );


        const netCostCents =
          grossCostCents -
          calculatedDiscountCents;


        const effectiveUnitCostCents =
          receivedQuantity >
          0
            ? Math.round(
                netCostCents /
                receivedQuantity,
              )
            : supplierUnitCostCents;


        const previousInventoryValueCents =
          Math.round(
            previousQuantity *
            oldCostCents,
          );


        const resultingInventoryValueCents =
          previousInventoryValueCents +
          netCostCents;


        const averageCostCents =
          resultingQuantity >
          0
            ? Math.round(
                resultingInventoryValueCents /
                resultingQuantity,
              )
            : effectiveUnitCostCents;


        return {
          previousQuantity,

          receivedQuantity,

          resultingQuantity,

          oldCostCents,

          supplierUnitCostCents,

          grossCostCents,

          discountCents:
            calculatedDiscountCents,

          netCostCents,

          effectiveUnitCostCents,

          averageCostCents,

          previousInventoryValueCents,

          resultingInventoryValueCents,
        };
      },
      [
        selectedProduct,
        quantity,
        supplierUnitCost,
        discountType,
        discountValue,
      ],
    );


  /* =========================================
     CLEAR FOR NEXT PRODUCT
  ========================================= */

  function clearForNextProduct() {
    setSelectedProduct(
      null,
    );

    setSearch(
      "",
    );

    setQuantity(
      "",
    );

    setSupplierUnitCost(
      "",
    );

    setNewSellingPrice(
      "",
    );

    setDiscountType(
      "NONE",
    );

    setDiscountValue(
      "",
    );

    setSupplierName(
      "",
    );

    setReferenceNumber(
      "",
    );

    setNotes(
      "",
    );


    window.setTimeout(
      () => {
        searchInputRef
          .current
          ?.focus();
      },
      50,
    );
  }


  /* =========================================
     RECEIVE STOCK
  ========================================= */

  async function handleReceiveStock(
    event,
  ) {
    event.preventDefault();


    if (saving) {
      return;
    }


    setError(
      "",
    );


    if (!selectedProduct) {
      setError(
        "Select a product first.",
      );

      return;
    }


    const receivedQuantity =
      Number(
        quantity,
      );


    if (
      !Number.isFinite(
        receivedQuantity,
      ) ||
      receivedQuantity <= 0
    ) {
      setError(
        "Enter a valid quantity received.",
      );

      return;
    }


    const supplierUnitCostCents =
      moneyInputToCents(
        supplierUnitCost,
      );


    if (
      supplierUnitCostCents <
      0
    ) {
      setError(
        "Enter a valid purchase cost.",
      );

      return;
    }


    const newSellingPriceCents =
      moneyInputToCents(
        newSellingPrice,
      );


    if (
      newSellingPriceCents <
      0
    ) {
      setError(
        "Enter a valid selling price.",
      );

      return;
    }


    let discountRateBasisPoints =
      null;


    let fixedDiscountCents =
      0;


    if (
      discountType ===
      "PERCENT"
    ) {
      const percentage =
        Number(
          discountValue,
        );


      if (
        !Number.isFinite(
          percentage,
        ) ||
        percentage < 0 ||
        percentage > 100
      ) {
        setError(
          "Discount percentage must be between 0 and 100.",
        );

        return;
      }


      discountRateBasisPoints =
        Math.round(
          percentage *
          100,
        );
    }


    if (
      discountType ===
      "FIXED"
    ) {
      fixedDiscountCents =
        moneyInputToCents(
          discountValue,
        );


      if (
        fixedDiscountCents >
        preview
          .grossCostCents
      ) {
        setError(
          "Discount cannot exceed the purchase subtotal.",
        );

        return;
      }
    }


    try {
      setSaving(
        true,
      );


      const result =
        await window.api
          .receiveStockPurchase({
            productId:
              selectedProduct.id,

            quantity:
              receivedQuantity,

            supplierUnitCostCents,

            newSellingPriceCents,

            discountType,

            discountRateBasisPoints,

            discountCents:
              fixedDiscountCents,

            paymentMethod,

            supplierName:
              supplierName
                .trim(),

            referenceNumber:
              referenceNumber
                .trim(),

            notes:
              notes.trim(),
          });


      setSuccessResult(
        result,
      );


      await loadProducts();


      if (
        onStockReceived
      ) {
        await onStockReceived(
          result,
        );
      }


      setSelectedProduct(
        null,
      );

      setSearch(
        "",
      );

      setQuantity(
        "",
      );

      setSupplierUnitCost(
        "",
      );

      setNewSellingPrice(
        "",
      );

      setDiscountType(
        "NONE",
      );

      setDiscountValue(
        "",
      );


      /*
       * Keep supplier/payment/reference available
       * because the user may be receiving several
       * products from the same delivery.
       */


      window.setTimeout(
        () => {
          searchInputRef
            .current
            ?.focus();
        },
        50,
      );

    } catch (receiveError) {
      console.error(
        "Unable to receive stock:",
        receiveError,
      );


      setError(
        receiveError?.message ||
        "Unable to receive stock.",
      );

    } finally {
      setSaving(
        false,
      );
    }
  }


  if (!isOpen) {
    return null;
  }


  return (
    <div
      className="receive-stock-backdrop"
      onMouseDown={
        (event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            onClose?.();
          }
        }
      }
    >
      <div
        className="receive-stock-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receive-stock-title"
      >

        {/* =====================================
            HEADER
        ===================================== */}

        <div
          className="receive-stock-header"
        >
          <div>
            <h2
              id="receive-stock-title"
            >
              Receive Stock
            </h2>

            <p>
              Record stock quantity, purchase cost and supplier details.
            </p>
          </div>


          <button
            type="button"
            className="receive-stock-close"
            onClick={
              onClose
            }
            aria-label="Close"
          >
            ×
          </button>
        </div>


        <div
          className="receive-stock-body"
        >

          {/* =====================================
              SUCCESS SUMMARY
          ===================================== */}

          {
            successResult && (
              <div
                className="receive-stock-success-card"
              >
                <div
                  className="receive-stock-success-title"
                >
                  Stock Received Successfully
                </div>


                <div
                  className="receive-stock-success-product"
                >
                  {
                    successResult
                      .productName
                  }

                  {
                    successResult
                      .purchaseNumber &&
                    (
                      <span>
                        {
                          successResult
                            .purchaseNumber
                        }
                      </span>
                    )
                  }
                </div>


                <div
                  className="receive-stock-summary-grid"
                >
                  <div>
                    <span>
                      Previous Stock
                    </span>

                    <strong>
                      {
                        successResult
                          .previousQuantity
                      }
                    </strong>
                  </div>


                  <div>
                    <span>
                      Received
                    </span>

                    <strong>
                      +
                      {
                        successResult
                          .receivedQuantity
                      }
                    </strong>
                  </div>


                  <div>
                    <span>
                      New Stock
                    </span>

                    <strong>
                      {
                        successResult
                          .resultingQuantity
                      }
                    </strong>
                  </div>


                  <div>
                    <span>
                      Old Cost
                    </span>

                    <strong>
                      Ksh{" "}
                      {
                        formatMoneyFromCents(
                          successResult
                            .oldCostCents,
                        )
                      }
                    </strong>
                  </div>


                  <div>
                    <span>
                      Purchase Cost
                    </span>

                    <strong>
                      Ksh{" "}
                      {
                        formatMoneyFromCents(
                          successResult
                            .effectiveUnitCostCents,
                        )
                      }
                    </strong>
                  </div>


                  <div
                    className="receive-stock-average-highlight"
                  >
                    <span>
                      Average Cost
                    </span>

                    <strong>
                      Ksh{" "}
                      {
                        formatMoneyFromCents(
                          successResult
                            .averageCostCents,
                        )
                      }
                    </strong>
                  </div>
                </div>


                <div
                  className="receive-stock-value-row"
                >
                  <div>
                    <span>
                      Old Inventory Value
                    </span>

                    <strong>
                      Ksh{" "}
                      {
                        formatMoneyFromCents(
                          successResult
                            .previousInventoryValueCents,
                        )
                      }
                    </strong>
                  </div>


                  {
                    Number(
                      successResult
                        .grossCostCents ??
                      0,
                    ) > 0 && (
                      <div>
                        <span>
                          Gross Purchase
                        </span>

                        <strong>
                          Ksh{" "}
                          {
                            formatMoneyFromCents(
                              successResult
                                .grossCostCents,
                            )
                          }
                        </strong>
                      </div>
                    )
                  }


                  {
                    Number(
                      successResult
                        .discountCents ??
                      0,
                    ) > 0 && (
                      <div>
                        <span>
                          Discount
                        </span>

                        <strong>
                          - Ksh{" "}
                          {
                            formatMoneyFromCents(
                              successResult
                                .discountCents,
                            )
                          }
                        </strong>
                      </div>
                    )
                  }


                  <div>
                    <span>
                      Net Purchase
                    </span>

                    <strong>
                      Ksh{" "}
                      {
                        formatMoneyFromCents(
                          successResult
                            .netCostCents,
                        )
                      }
                    </strong>
                  </div>


                  <div>
                    <span>
                      New Inventory Value
                    </span>

                    <strong>
                      Ksh{" "}
                      {
                        formatMoneyFromCents(
                          successResult
                            .resultingInventoryValueCents,
                        )
                      }
                    </strong>
                  </div>
                </div>


                {
                  Number(
                    successResult
                      .previousSellingPriceCents ??
                    0,
                  ) !==
                  Number(
                    successResult
                      .newSellingPriceCents ??
                    successResult
                      .previousSellingPriceCents ??
                    0,
                  ) && (
                    <div
                      className="receive-stock-selling-price-change"
                    >
                      <span>
                        Selling Price Updated
                      </span>

                      <strong>
                        Ksh{" "}
                        {
                          formatMoneyFromCents(
                            successResult
                              .previousSellingPriceCents,
                          )
                        }
                        {" → "}
                        Ksh{" "}
                        {
                          formatMoneyFromCents(
                            successResult
                              .newSellingPriceCents,
                          )
                        }
                      </strong>
                    </div>
                  )
                }
              </div>
            )
          }


          {/* =====================================
              SEARCH PRODUCT
          ===================================== */}

          <div
            className="receive-stock-section"
          >
            <div
              className="receive-stock-section-title"
            >
              Product
            </div>


            <label
              className="receive-stock-field"
            >
              <span>
                Search / Scan
              </span>

              <input
                ref={
                  searchInputRef
                }
                type="text"
                value={
                  search
                }
                onChange={
                  (event) => {
                    setSearch(
                      event
                        .target
                        .value,
                    );

                    setSuccessResult(
                      null,
                    );
                  }
                }
                onKeyDown={
                  handleSearchKeyDown
                }
                placeholder="Product name, SKU or barcode"
                autoComplete="off"
              />
            </label>


            {
              loadingProducts && (
                <div
                  className="receive-stock-loading"
                >
                  Loading products...
                </div>
              )
            }


            {
              !selectedProduct &&
              !loadingProducts &&
              filteredProducts.length >
              0 && (
                <div
                  className="receive-stock-results"
                >
                  {
                    filteredProducts.map(
                      (
                        product,
                      ) => (
                        <button
                          key={
                            product.id
                          }
                          type="button"
                          className="receive-stock-result"
                          onClick={
                            () =>
                              selectProduct(
                                product,
                              )
                          }
                        >
                          <div>
                            <strong>
                              {
                                product.name
                              }
                            </strong>

                            <span>
                              {
                                product.sku ||
                                product.barcode ||
                                "No SKU / barcode"
                              }
                            </span>
                          </div>


                          <div
                            className="receive-stock-result-stock"
                          >
                            {
                              Number(
                                product
                                  .inventory_quantity ??
                                0,
                              )
                            }{" "}
                            in stock
                          </div>
                        </button>
                      ),
                    )
                  }
                </div>
              )
            }
          </div>


          {/* =====================================
              SELECTED PRODUCT
          ===================================== */}

          {
            selectedProduct && (
              <form
                onSubmit={
                  handleReceiveStock
                }
              >

                <div
                  className="receive-stock-product-card"
                >
                  <div>
                    <span>
                      Selected Product
                    </span>

                    <strong>
                      {
                        selectedProduct
                          .name
                      }
                    </strong>
                  </div>


                  <div>
                    <span>
                      Current Stock
                    </span>

                    <strong>
                      {
                        preview
                          .previousQuantity
                      }
                    </strong>
                  </div>


                  <button
                    type="button"
                    onClick={
                      () => {
                        setSelectedProduct(
                          null,
                        );

                        setSearch(
                          "",
                        );

                        setSuccessResult(
                          null,
                        );

                        window
                          .setTimeout(
                            () => {
                              searchInputRef
                                .current
                                ?.focus();
                            },
                            50,
                          );
                      }
                    }
                  >
                    Change
                  </button>
                </div>


                {/* =====================================
                    STOCK + PRICES
                ===================================== */}

                <div
                  className="receive-stock-form-grid"
                >

                  <label
                    className="receive-stock-field"
                  >
                    <span>
                      Quantity Received
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        quantity
                      }
                      onChange={
                        (event) =>
                          setQuantity(
                            event
                              .target
                              .value,
                          )
                      }
                      placeholder="0"
                    />
                  </label>


                  <div
                    className="receive-stock-readonly-field"
                  >
                    <span>
                      New Stock
                    </span>

                    <strong>
                      {
                        preview
                          .resultingQuantity
                      }
                    </strong>
                  </div>


                  <div
                    className="receive-stock-readonly-field"
                  >
                    <span>
                      Old Cost
                    </span>

                    <strong>
                      Ksh{" "}
                      {
                        formatMoneyFromCents(
                          preview
                            .oldCostCents,
                        )
                      }
                    </strong>
                  </div>


                  <label
                    className="receive-stock-field"
                  >
                    <span>
                      New Purchase Cost / Unit
                    </span>

                    <div
                      className="receive-stock-money-input"
                    >
                      <span>
                        Ksh
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          supplierUnitCost
                        }
                        onChange={
                          (event) =>
                            setSupplierUnitCost(
                              event
                                .target
                                .value,
                            )
                        }
                      />
                    </div>
                  </label>


                  <div
                    className="receive-stock-readonly-field"
                  >
                    <span>
                      Current Selling Price
                    </span>

                    <strong>
                      Ksh{" "}
                      {
                        formatMoneyFromCents(
                          selectedProduct
                            .selling_price_cents,
                        )
                      }
                    </strong>
                  </div>


                  <label
                    className="receive-stock-field"
                  >
                    <span>
                      New Selling Price
                    </span>

                    <div
                      className="receive-stock-money-input"
                    >
                      <span>
                        Ksh
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          newSellingPrice
                        }
                        onChange={
                          (event) =>
                            setNewSellingPrice(
                              event
                                .target
                                .value,
                            )
                        }
                      />
                    </div>
                  </label>

                </div>


                {/* =====================================
                    DISCOUNT
                ===================================== */}

                <div
                  className="receive-stock-subsection"
                >
                  <div
                    className="receive-stock-subsection-title"
                  >
                    Purchase Discount
                  </div>


                  <div
                    className="receive-stock-form-grid"
                  >
                    <label
                      className="receive-stock-field"
                    >
                      <span>
                        Discount Type
                      </span>

                      <select
                        value={
                          discountType
                        }
                        onChange={
                          (event) => {
                            setDiscountType(
                              event
                                .target
                                .value,
                            );

                            setDiscountValue(
                              "",
                            );
                          }
                        }
                      >
                        {
                          DISCOUNT_TYPES.map(
                            (
                              type,
                            ) => (
                              <option
                                key={
                                  type.value
                                }
                                value={
                                  type.value
                                }
                              >
                                {
                                  type.label
                                }
                              </option>
                            ),
                          )
                        }
                      </select>
                    </label>


                    {
                      discountType !==
                      "NONE" && (
                        <label
                          className="receive-stock-field"
                        >
                          <span>
                            {
                              discountType ===
                              "PERCENT"
                                ? "Discount %"
                                : "Discount Amount"
                            }
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              discountValue
                            }
                            onChange={
                              (event) =>
                                setDiscountValue(
                                  event
                                    .target
                                    .value,
                                )
                            }
                            placeholder={
                              discountType ===
                              "PERCENT"
                                ? "0"
                                : "0.00"
                            }
                          />
                        </label>
                      )
                    }
                  </div>
                </div>


                {/* =====================================
                    LIVE COST PREVIEW
                ===================================== */}

                <div
                  className="receive-stock-cost-preview"
                >
                  <div
                    className="receive-stock-cost-preview-title"
                  >
                    Cost Preview
                  </div>


                  <div
                    className="receive-stock-cost-grid"
                  >
                    <div>
                      <span>
                        Old Cost
                      </span>

                      <strong>
                        Ksh{" "}
                        {
                          formatMoneyFromCents(
                            preview
                              .oldCostCents,
                          )
                        }
                      </strong>
                    </div>


                    <div>
                      <span>
                        Purchase Cost
                      </span>

                      <strong>
                        Ksh{" "}
                        {
                          formatMoneyFromCents(
                            preview
                              .effectiveUnitCostCents,
                          )
                        }
                      </strong>
                    </div>


                    <div
                      className="receive-stock-average-highlight"
                    >
                      <span>
                        Average Cost
                      </span>

                      <strong>
                        Ksh{" "}
                        {
                          formatMoneyFromCents(
                            preview
                              .averageCostCents,
                          )
                        }
                      </strong>
                    </div>
                  </div>


                  <div
                    className="receive-stock-calculation"
                  >
                    <div>
                      <span>
                        Old Inventory Value
                      </span>

                      <strong>
                        {
                          preview
                            .previousQuantity
                        }{" "}
                        × Ksh{" "}
                        {
                          formatMoneyFromCents(
                            preview
                              .oldCostCents,
                          )
                        }

                        {" = "}

                        Ksh{" "}
                        {
                          formatMoneyFromCents(
                            preview
                              .previousInventoryValueCents,
                          )
                        }
                      </strong>
                    </div>


                    <div>
                      <span>
                        Gross Purchase
                      </span>

                      <strong>
                        {
                          preview
                            .receivedQuantity
                        }{" "}
                        × Ksh{" "}
                        {
                          formatMoneyFromCents(
                            preview
                              .supplierUnitCostCents,
                          )
                        }

                        {" = "}

                        Ksh{" "}
                        {
                          formatMoneyFromCents(
                            preview
                              .grossCostCents,
                          )
                        }
                      </strong>
                    </div>


                    {
                      preview
                        .discountCents >
                      0 && (
                        <>
                          <div>
                            <span>
                              Discount
                            </span>

                            <strong>
                              - Ksh{" "}
                              {
                                formatMoneyFromCents(
                                  preview
                                    .discountCents,
                                )
                              }
                            </strong>
                          </div>

                          <div>
                            <span>
                              Effective Purchase Cost / Unit
                            </span>

                            <strong>
                              Ksh{" "}
                              {
                                formatMoneyFromCents(
                                  preview
                                    .effectiveUnitCostCents,
                                )
                              }
                            </strong>
                          </div>
                        </>
                      )
                    }


                    <div>
                      <span>
                        Net Purchase
                      </span>

                      <strong>
                        Ksh{" "}
                        {
                          formatMoneyFromCents(
                            preview
                              .netCostCents,
                          )
                        }
                      </strong>
                    </div>


                    <div>
                      <span>
                        New Inventory Value
                      </span>

                      <strong>
                        Ksh{" "}
                        {
                          formatMoneyFromCents(
                            preview
                              .resultingInventoryValueCents,
                          )
                        }
                      </strong>
                    </div>
                  </div>
                </div>


                {/* =====================================
                    SUPPLIER + PAYMENT
                ===================================== */}

                <div
                  className="receive-stock-subsection"
                >
                  <div
                    className="receive-stock-subsection-title"
                  >
                    Supplier & Payment
                  </div>


                  <div
                    className="receive-stock-form-grid"
                  >
                    <label
                      className="receive-stock-field"
                    >
                      <span>
                        Supplier
                      </span>

                      <input
                        type="text"
                        value={
                          supplierName
                        }
                        onChange={
                          (event) =>
                            setSupplierName(
                              event
                                .target
                                .value,
                            )
                        }
                        placeholder="Supplier name"
                      />
                    </label>


                    <label
                      className="receive-stock-field"
                    >
                      <span>
                        Payment Method
                      </span>

                      <select
                        value={
                          paymentMethod
                        }
                        onChange={
                          (event) =>
                            setPaymentMethod(
                              event
                                .target
                                .value,
                            )
                        }
                      >
                        {
                          PAYMENT_METHODS.map(
                            (
                              method,
                            ) => (
                              <option
                                key={
                                  method.value
                                }
                                value={
                                  method.value
                                }
                              >
                                {
                                  method.label
                                }
                              </option>
                            ),
                          )
                        }
                      </select>
                    </label>


                    <label
                      className="receive-stock-field"
                    >
                      <span>
                        Reference
                      </span>

                      <input
                        type="text"
                        value={
                          referenceNumber
                        }
                        onChange={
                          (event) =>
                            setReferenceNumber(
                              event
                                .target
                                .value,
                            )
                        }
                        placeholder="Invoice / M-Pesa reference"
                      />
                    </label>


                    <label
                      className="receive-stock-field"
                    >
                      <span>
                        Notes
                      </span>

                      <input
                        type="text"
                        value={
                          notes
                        }
                        onChange={
                          (event) =>
                            setNotes(
                              event
                                .target
                                .value,
                            )
                        }
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                </div>


                {
                  error && (
                    <div
                      className="receive-stock-error"
                    >
                      {error}
                    </div>
                  )
                }


                <div
                  className="receive-stock-footer"
                >
                  <button
                    type="button"
                    className="receive-stock-secondary-button"
                    onClick={
                      onClose
                    }
                    disabled={
                      saving
                    }
                  >
                    Done
                  </button>


                  <button
                    type="submit"
                    className="receive-stock-primary-button"
                    disabled={
                      saving
                    }
                  >
                    {
                      saving
                        ? "Saving..."
                        : "Receive Stock"
                    }
                  </button>
                </div>
              </form>
            )
          }


          {
            !selectedProduct &&
            error && (
              <div
                className="receive-stock-error"
              >
                {error}
              </div>
            )
          }

        </div>
      </div>
    </div>
  );
}


export default ReceiveStockModal;