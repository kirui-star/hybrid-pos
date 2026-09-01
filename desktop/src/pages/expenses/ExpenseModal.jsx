import {
  useEffect,
  useRef,
  useState,
} from "react";

import "./ExpenseModal.css";


const EXPENSE_CATEGORIES = [
  {
    value: "RENT",
    label: "Rent",
  },
  {
    value: "UTILITIES",
    label: "Utilities",
  },
  {
    value: "TRANSPORT",
    label: "Transport",
  },
  {
    value: "SUPPLIES",
    label: "Supplies",
  },
  {
    value: "REPAIRS",
    label: "Repairs",
  },
  {
    value: "WAGES",
    label: "Wages",
  },
  {
    value: "FOOD",
    label: "Food",
  },
  {
    value: "INTERNET",
    label: "Internet",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];


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
    value: "OTHER",
    label: "Other",
  },
];


function ExpenseModal({
  isOpen,
  onClose,
  onExpenseCreated,
}) {

  const descriptionRef =
    useRef(null);


  const [
    category,
    setCategory,
  ] = useState(
    "SUPPLIES",
  );


  const [
    description,
    setDescription,
  ] = useState(
    "",
  );


  const [
    amount,
    setAmount,
  ] = useState(
    "",
  );


  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState(
    "CASH",
  );


  const [
    referenceNumber,
    setReferenceNumber,
  ] = useState(
    "",
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


  const [
    success,
    setSuccess,
  ] = useState(
    "",
  );


  /* =========================================
     RESET
  ========================================= */

  function resetForm() {
    setCategory(
      "SUPPLIES",
    );

    setDescription(
      "",
    );

    setAmount(
      "",
    );

    setPaymentMethod(
      "CASH",
    );

    setReferenceNumber(
      "",
    );

    setNotes(
      "",
    );
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

      setSuccess(
        "",
      );


      window.setTimeout(
        () => {
          descriptionRef
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
     ESCAPE KEY
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
     SAVE
  ========================================= */

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();


    if (saving) {
      return;
    }


    setError(
      "",
    );

    setSuccess(
      "",
    );


    const cleanDescription =
      description.trim();


    if (!cleanDescription) {
      setError(
        "Enter an expense description.",
      );

      descriptionRef
        .current
        ?.focus();

      return;
    }


    const numericAmount =
      Number(
        amount,
      );


    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      setError(
        "Enter a valid expense amount.",
      );

      return;
    }


    const amountCents =
      Math.round(
        numericAmount *
        100,
      );


    try {
      setSaving(
        true,
      );


      const createdExpense =
        await window.api
          .createExpense({
            category,

            description:
              cleanDescription,

            amountCents,

            paymentMethod,

            referenceNumber:
              referenceNumber
                .trim(),

            notes:
              notes.trim(),
          });


      setSuccess(
        "Expense saved successfully.",
      );


      resetForm();


      if (
        onExpenseCreated
      ) {
        await onExpenseCreated(
          createdExpense,
        );
      }


      window.setTimeout(
        () => {
          descriptionRef
            .current
            ?.focus();
        },
        50,
      );

    } catch (saveError) {
      console.error(
        "Unable to save expense:",
        saveError,
      );


      setError(
        saveError?.message ||
        "Unable to save expense.",
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
      className="expense-modal-backdrop"
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
        className="expense-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-modal-title"
      >

        {/* HEADER */}

        <div
          className="expense-modal-header"
        >
          <div>
            <h2
              id="expense-modal-title"
            >
              Add Expense
            </h2>

            <p>
              Record a business expense.
            </p>
          </div>


          <button
            type="button"
            className="expense-modal-close"
            onClick={
              onClose
            }
            aria-label="Close"
          >
            ×
          </button>
        </div>


        {/* FORM */}

        <form
          className="expense-modal-form"
          onSubmit={
            handleSubmit
          }
        >

          <div
            className="expense-form-grid"
          >

            {/* CATEGORY */}

            <div
              className="expense-field"
            >
              <label
                htmlFor="expense-category"
              >
                Category
              </label>

              <select
                id="expense-category"
                value={
                  category
                }
                onChange={
                  (event) =>
                    setCategory(
                      event
                        .target
                        .value,
                    )
                }
              >
                {
                  EXPENSE_CATEGORIES
                    .map(
                      (
                        expenseCategory,
                      ) => (
                        <option
                          key={
                            expenseCategory
                              .value
                          }
                          value={
                            expenseCategory
                              .value
                          }
                        >
                          {
                            expenseCategory
                              .label
                          }
                        </option>
                      ),
                    )
                }
              </select>
            </div>


            {/* PAYMENT */}

            <div
              className="expense-field"
            >
              <label
                htmlFor="expense-payment"
              >
                Payment Method
              </label>

              <select
                id="expense-payment"
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
                  PAYMENT_METHODS
                    .map(
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
            </div>


            {/* DESCRIPTION */}

            <div
              className="expense-field expense-field-full"
            >
              <label
                htmlFor="expense-description"
              >
                Description
              </label>

              <input
                ref={
                  descriptionRef
                }
                id="expense-description"
                type="text"
                value={
                  description
                }
                onChange={
                  (event) =>
                    setDescription(
                      event
                        .target
                        .value,
                    )
                }
                placeholder="e.g. Cleaning materials"
                autoComplete="off"
              />
            </div>


            {/* AMOUNT */}

            <div
              className="expense-field"
            >
              <label
                htmlFor="expense-amount"
              >
                Amount
              </label>

              <div
                className="expense-amount-input"
              >
                <span>
                  Ksh
                </span>

                <input
                  id="expense-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    amount
                  }
                  onChange={
                    (event) =>
                      setAmount(
                        event
                          .target
                          .value,
                      )
                  }
                  placeholder="0.00"
                />
              </div>
            </div>


            {/* REFERENCE */}

            <div
              className="expense-field"
            >
              <label
                htmlFor="expense-reference"
              >
                Reference
                <span>
                  Optional
                </span>
              </label>

              <input
                id="expense-reference"
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
                placeholder="Receipt / M-Pesa reference"
                autoComplete="off"
              />
            </div>


            {/* NOTES */}

            <div
              className="expense-field expense-field-full"
            >
              <label
                htmlFor="expense-notes"
              >
                Notes
                <span>
                  Optional
                </span>
              </label>

              <textarea
                id="expense-notes"
                rows="3"
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
                placeholder="Additional details"
              />
            </div>

          </div>


          {/* MESSAGES */}

          {
            error && (
              <div
                className="expense-message expense-message-error"
              >
                {error}
              </div>
            )
          }


          {
            success && (
              <div
                className="expense-message expense-message-success"
              >
                {success}
              </div>
            )
          }


          {/* FOOTER */}

          <div
            className="expense-modal-footer"
          >
            <button
              type="button"
              className="expense-secondary-button"
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
              className="expense-primary-button"
              disabled={
                saving
              }
            >
              {
                saving
                  ? "Saving..."
                  : "Save Expense"
              }
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}


export default ExpenseModal;