import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./AdjustInventoryModal.css";


/* =========================================
   ADJUSTMENT TYPES
========================================= */

const ADJUSTMENT_TYPES = [
  {
    value: "ADD",
    label: "Add Stock",
  },
  {
    value: "REMOVE",
    label: "Remove Stock",
  },
  {
    value: "SET",
    label: "Set Quantity",
  },
];


/* =========================================
   REASONS
========================================= */

const ADJUSTMENT_REASONS = [
  {
    value: "Stock Count Correction",
    label: "Stock Count Correction",
  },
  {
    value: "Damaged",
    label: "Damaged",
  },
  {
    value: "Expired",
    label: "Expired",
  },
  {
    value: "Lost / Missing",
    label: "Lost / Missing",
  },
  {
    value: "Found Stock",
    label: "Found Stock",
  },
  {
    value: "Return to Supplier",
    label: "Return to Supplier",
  },
  {
    value: "Other",
    label: "Other",
  },
];


/* =========================================
   MONEY FORMAT
========================================= */

function formatMoneyFromCents(
  cents,
) {
  const value =
    Number(
      cents ?? 0,
    ) / 100;


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


/* =========================================
   QUANTITY FORMAT
========================================= */

function formatQuantity(
  value,
) {
  const number =
    Number(
      value ?? 0,
    );


  if (
    !Number.isFinite(
      number,
    )
  ) {
    return "0";
  }


  if (
    Number.isInteger(
      number,
    )
  ) {
    return String(
      number,
    );
  }


  return number
    .toFixed(2)
    .replace(
      /\.?0+$/,
      "",
    );
}


/* =========================================
   COMPONENT
========================================= */

function AdjustInventoryModal({
  isOpen,
  product,
  onClose,
  onInventoryAdjusted,
}) {

  const quantityInputRef =
    useRef(null);


  const [
    adjustmentType,
    setAdjustmentType,
  ] = useState(
    "ADD",
  );


  const [
    adjustmentQuantity,
    setAdjustmentQuantity,
  ] = useState(
    "",
  );


  const [
    reason,
    setReason,
  ] = useState(
    "Stock Count Correction",
  );


  const [
    notes,
    setNotes,
  ] = useState(
    "",
  );


  const [
    saving,
    setSaving,
  ] = useState(
    false,
  );


  const [
    error,
    setError,
  ] = useState(
    "",
  );


  /* =========================================
     PRODUCT VALUES
  ========================================= */

  const currentQuantity =
    Number(
      product
        ?.inventory_quantity ??
      0,
    );


  const currentCostCents =
    Number(
      product
        ?.cost_price_cents ??
      0,
    );


  /* =========================================
     CALCULATIONS
  ========================================= */

  const calculation =
    useMemo(
      () => {

        const enteredQuantity =
          Number(
            adjustmentQuantity,
          );


        const safeAdjustmentQuantity =
          Number.isFinite(
            enteredQuantity,
          )
            ? Math.max(
                enteredQuantity,
                0,
              )
            : 0;


        let resultingQuantity =
          currentQuantity;


        if (
          adjustmentType ===
          "ADD"
        ) {
          resultingQuantity =
            currentQuantity +
            safeAdjustmentQuantity;
        }


        if (
          adjustmentType ===
          "REMOVE"
        ) {
          resultingQuantity =
            currentQuantity -
            safeAdjustmentQuantity;
        }


        if (
          adjustmentType ===
          "SET"
        ) {
          resultingQuantity =
            safeAdjustmentQuantity;
        }


        const currentInventoryValueCents =
          Math.round(
            currentQuantity *
            currentCostCents,
          );


        const resultingInventoryValueCents =
          Math.round(
            resultingQuantity *
            currentCostCents,
          );


        const inventoryValueChangeCents =
          resultingInventoryValueCents -
          currentInventoryValueCents;


        const quantityChange =
          resultingQuantity -
          currentQuantity;


        return {
          safeAdjustmentQuantity,

          resultingQuantity,

          quantityChange,

          currentInventoryValueCents,

          resultingInventoryValueCents,

          inventoryValueChangeCents,
        };
      },
      [
        adjustmentQuantity,
        adjustmentType,
        currentQuantity,
        currentCostCents,
      ],
    );


  /* =========================================
     OPEN / RESET
  ========================================= */

  useEffect(
    () => {
      if (!isOpen) {
        return;
      }


      setAdjustmentType(
        "ADD",
      );

      setAdjustmentQuantity(
        "",
      );

      setReason(
        "Stock Count Correction",
      );

      setNotes(
        "",
      );

      setError(
        "",
      );

      setSaving(
        false,
      );


      window.setTimeout(
        () => {
          quantityInputRef
            .current
            ?.focus();
        },
        80,
      );
    },
    [
      isOpen,
      product?.id,
    ],
  );


  /* =========================================
     ESCAPE
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
          "Escape" &&
          !saving
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
      saving,
      onClose,
    ],
  );


  /* =========================================
     CHANGE TYPE
  ========================================= */

  function handleAdjustmentTypeChange(
    type,
  ) {
    setAdjustmentType(
      type,
    );

    setAdjustmentQuantity(
      "",
    );

    setError(
      "",
    );


    window.setTimeout(
      () => {
        quantityInputRef
          .current
          ?.focus();
      },
      20,
    );
  }


  /* =========================================
     APPLY ADJUSTMENT
  ========================================= */

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();


    if (
      saving ||
      !product
    ) {
      return;
    }


    setError(
      "",
    );


    const quantity =
      Number(
        adjustmentQuantity,
      );


    if (
      !Number.isFinite(
        quantity,
      ) ||
      quantity < 0
    ) {
      setError(
        "Enter a valid adjustment quantity.",
      );

      return;
    }


    if (
      adjustmentType !==
        "SET" &&
      quantity <= 0
    ) {
      setError(
        "Adjustment quantity must be greater than zero.",
      );

      return;
    }


    if (
      adjustmentType ===
        "SET" &&
      quantity < 0
    ) {
      setError(
        "Inventory quantity cannot be negative.",
      );

      return;
    }


    if (
      calculation
        .resultingQuantity <
      0
    ) {
      setError(
        "Cannot reduce inventory below zero.",
      );

      return;
    }


    if (
      calculation
        .resultingQuantity ===
        currentQuantity
    ) {
      setError(
        "The resulting quantity is the same as the current quantity.",
      );

      return;
    }


    try {
      setSaving(
        true,
      );


      const result =
        await window.api
          .adjustInventory({
            productId:
              product.id,

            resultingQuantity:
              calculation
                .resultingQuantity,

            adjustmentType,

            quantityChange:
              calculation
                .quantityChange,

            reason,

            notes:
              notes.trim(),
          });


      if (
        onInventoryAdjusted
      ) {
        await onInventoryAdjusted(
          result,
        );
      }


      onClose?.();

    } catch (
      adjustmentError
    ) {
      console.error(
        "Unable to adjust inventory:",
        adjustmentError,
      );


      setError(
        adjustmentError?.message ||
        "Unable to adjust inventory.",
      );

    } finally {
      setSaving(
        false,
      );
    }
  }


  /* =========================================
     VALUE CHANGE DISPLAY
  ========================================= */

  const valueChangePrefix =
    calculation
      .inventoryValueChangeCents >
    0
      ? "+"
      : calculation
          .inventoryValueChangeCents <
        0
        ? "-"
        : "";


  const absoluteValueChangeCents =
    Math.abs(
      calculation
        .inventoryValueChangeCents,
    );


  /* =========================================
     RETURN
  ========================================= */

  if (
    !isOpen ||
    !product
  ) {
    return null;
  }


  return (
    <div
      className="adjust-inventory-backdrop"
      onMouseDown={
        (event) => {
          if (
            event.target ===
            event.currentTarget &&
            !saving
          ) {
            onClose?.();
          }
        }
      }
    >
      <div
        className="adjust-inventory-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-inventory-title"
      >

        {/* =====================================
            HEADER
        ===================================== */}

        <div
          className="adjust-inventory-header"
        >
          <div>
            <h2
              id="adjust-inventory-title"
            >
              Adjust Inventory
            </h2>

            <p>
              {product.name}
            </p>
          </div>


          <button
            type="button"
            className="adjust-inventory-close"
            onClick={
              onClose
            }
            disabled={
              saving
            }
            aria-label="Close"
          >
            ×
          </button>
        </div>


        {/* =====================================
            BODY
        ===================================== */}

        <form
          className="adjust-inventory-body"
          onSubmit={
            handleSubmit
          }
        >

          {/* =====================================
              CURRENT INVENTORY
          ===================================== */}

          <div
            className="adjust-inventory-current-card"
          >
            <div>
              <span>
                Current Quantity
              </span>

              <strong>
                {
                  formatQuantity(
                    currentQuantity,
                  )
                }
              </strong>
            </div>


            <div>
              <span>
                Current Cost / Unit
              </span>

              <strong>
                Ksh{" "}
                {
                  formatMoneyFromCents(
                    currentCostCents,
                  )
                }
              </strong>
            </div>


            <div
              className="adjust-inventory-current-value"
            >
              <span>
                Current Inventory Value
              </span>

              <strong>
                Ksh{" "}
                {
                  formatMoneyFromCents(
                    calculation
                      .currentInventoryValueCents,
                  )
                }
              </strong>
            </div>
          </div>


          {/* =====================================
              ADJUSTMENT TYPE
          ===================================== */}

          <div
            className="adjust-inventory-section"
          >
            <label
              className="adjust-inventory-label"
            >
              Adjustment Type
            </label>


            <div
              className="adjust-inventory-type-buttons"
            >
              {
                ADJUSTMENT_TYPES.map(
                  (
                    type,
                  ) => (
                    <button
                      key={
                        type.value
                      }
                      type="button"
                      className={
                        adjustmentType ===
                        type.value
                          ? "adjust-inventory-type-button active"
                          : "adjust-inventory-type-button"
                      }
                      onClick={
                        () =>
                          handleAdjustmentTypeChange(
                            type.value,
                          )
                      }
                    >
                      {type.label}
                    </button>
                  ),
                )
              }
            </div>
          </div>


          {/* =====================================
              QUANTITY
          ===================================== */}

          <div
            className="adjust-inventory-section"
          >
            <label
              className="adjust-inventory-field"
            >
              <span>
                {
                  adjustmentType ===
                  "SET"
                    ? "New Quantity"
                    : "Adjustment Quantity"
                }
              </span>


              <input
                ref={
                  quantityInputRef
                }
                type="number"
                min="0"
                step="0.01"
                value={
                  adjustmentQuantity
                }
                onChange={
                  (event) => {
                    setAdjustmentQuantity(
                      event
                        .target
                        .value,
                    );

                    setError(
                      "",
                    );
                  }
                }
                placeholder="0"
              />
            </label>
          </div>


          {/* =====================================
              RESULT
          ===================================== */}

          <div
            className="adjust-inventory-result-card"
          >
            <div>
              <span>
                Resulting Quantity
              </span>

              <strong
                className={
                  calculation
                    .resultingQuantity <
                  0
                    ? "negative"
                    : ""
                }
              >
                {
                  formatQuantity(
                    calculation
                      .resultingQuantity,
                  )
                }
              </strong>
            </div>


            <div>
              <span>
                Resulting Inventory Value
              </span>

              <strong>
                Ksh{" "}
                {
                  formatMoneyFromCents(
                    Math.max(
                      calculation
                        .resultingInventoryValueCents,
                      0,
                    ),
                  )
                }
              </strong>
            </div>


            <div
              className="adjust-inventory-value-change"
            >
              <span>
                Inventory Value Change
              </span>

              <strong
                className={
                  calculation
                    .inventoryValueChangeCents >
                  0
                    ? "positive"
                    : calculation
                        .inventoryValueChangeCents <
                      0
                      ? "negative"
                      : ""
                }
              >
                {
                  valueChangePrefix
                }
                {" "}
                Ksh{" "}
                {
                  formatMoneyFromCents(
                    absoluteValueChangeCents,
                  )
                }
              </strong>
            </div>
          </div>


          {/* =====================================
              REASON
          ===================================== */}

          <div
            className="adjust-inventory-section"
          >
            <label
              className="adjust-inventory-field"
            >
              <span>
                Reason
              </span>


              <select
                value={
                  reason
                }
                onChange={
                  (event) =>
                    setReason(
                      event
                        .target
                        .value,
                    )
                }
              >
                {
                  ADJUSTMENT_REASONS.map(
                    (
                      reasonOption,
                    ) => (
                      <option
                        key={
                          reasonOption
                            .value
                        }
                        value={
                          reasonOption
                            .value
                        }
                      >
                        {
                          reasonOption
                            .label
                        }
                      </option>
                    ),
                  )
                }
              </select>
            </label>
          </div>


          {/* =====================================
              NOTES
          ===================================== */}

          <div
            className="adjust-inventory-section"
          >
            <label
              className="adjust-inventory-field"
            >
              <span>
                Notes
              </span>


              <textarea
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
                rows="3"
                placeholder="Optional additional details"
              />
            </label>
          </div>


          {/* =====================================
              INFORMATION
          ===================================== */}

          <div
            className="adjust-inventory-info"
          >
            This adjustment changes inventory quantity only.
            The current average cost of Ksh{" "}
            {
              formatMoneyFromCents(
                currentCostCents,
              )
            }{" "}
            per unit will remain unchanged.
          </div>


          {/* =====================================
              ERROR
          ===================================== */}

          {
            error && (
              <div
                className="adjust-inventory-error"
              >
                {error}
              </div>
            )
          }


          {/* =====================================
              FOOTER
          ===================================== */}

          <div
            className="adjust-inventory-footer"
          >
            <button
              type="button"
              className="adjust-inventory-secondary-button"
              onClick={
                onClose
              }
              disabled={
                saving
              }
            >
              Cancel
            </button>


            <button
              type="submit"
              className="adjust-inventory-primary-button"
              disabled={
                saving ||
                calculation
                  .resultingQuantity <
                0
              }
            >
              {
                saving
                  ? "Applying..."
                  : "Apply Adjustment"
              }
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}


export default AdjustInventoryModal;