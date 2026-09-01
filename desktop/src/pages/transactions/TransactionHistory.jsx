import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./TransactionHistory.css";


/* =========================================
   DATE HELPERS
========================================= */

function formatDateInput(date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}


function getToday() {
  return formatDateInput(
    new Date(),
  );
}


function getYesterday() {
  const date =
    new Date();

  date.setDate(
    date.getDate() - 1,
  );

  return formatDateInput(
    date,
  );
}


function getStartOfWeek() {
  const date =
    new Date();

  const day =
    date.getDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  date.setDate(
    date.getDate() +
      difference,
  );

  return formatDateInput(
    date,
  );
}


function getStartOfMonth() {
  const date =
    new Date();

  return formatDateInput(
    new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
    ),
  );
}


/* =========================================
   DISPLAY HELPERS
========================================= */

function formatMoney(cents) {
  if (
    cents === null ||
    cents === undefined
  ) {
    return "—";
  }

  const amount =
    Number(cents) / 100;

  return new Intl.NumberFormat(
    "en-KE",
    {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 2,
    },
  ).format(
    amount,
  );
}


function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-KE",
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(
    date,
  );
}


function formatTransactionType(type) {
  switch (type) {
    case "SALE":
      return "Sale";

    case "PURCHASE":
      return "Purchase";

    case "EXPENSE":
      return "Expense";

    case "INVENTORY_ADJUSTMENT":
      return "Inventory Adjustment";

    default:
      return type ||
        "Transaction";
  }
}


function formatPaymentMethod(method) {
  switch (method) {
    case "MPESA":
      return "M-Pesa";

    case "CASH":
      return "Cash";

    case "BANK":
      return "Bank";

    case "CREDIT":
      return "Credit";

    case "OTHER":
      return "Other";

    default:
      return "—";
  }
}


/* =========================================
   COMPONENT
========================================= */

function TransactionHistory({
  embedded = false,
  onBackToDashboard,
}) {

  /* =========================================
     RESIZE STATE
  ========================================= */

  const tableResizeRef =
    useRef(null);


  const resizeStateRef =
    useRef({
      active: false,
      startY: 0,
      startHeight: 360,
    });


  const [
    tableHeight,
    setTableHeight,
  ] = useState(
    360,
  );


  /* =========================================
     DATA STATE
  ========================================= */

  const [
    transactions,
    setTransactions,
  ] = useState([]);


  const [
    isLoading,
    setIsLoading,
  ] = useState(true);


  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");


  const [
    selectedTransaction,
    setSelectedTransaction,
  ] = useState(null);


  /* =========================================
     FILTER STATE
  ========================================= */

  const [
    datePreset,
    setDatePreset,
  ] = useState(
    "TODAY",
  );


  const [
    startDate,
    setStartDate,
  ] = useState(
    getToday(),
  );


  const [
    endDate,
    setEndDate,
  ] = useState(
    getToday(),
  );


  const [
    transactionType,
    setTransactionType,
  ] = useState(
    "ALL",
  );


  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState(
    "ALL",
  );


  const [
    searchText,
    setSearchText,
  ] = useState("");


  /* =========================================
     DATE PRESETS
  ========================================= */

  function applyDatePreset(
    preset,
  ) {
    const today =
      getToday();

    setDatePreset(
      preset,
    );

    switch (preset) {
      case "TODAY":
        setStartDate(
          today,
        );

        setEndDate(
          today,
        );

        break;


      case "YESTERDAY": {
        const yesterday =
          getYesterday();

        setStartDate(
          yesterday,
        );

        setEndDate(
          yesterday,
        );

        break;
      }


      case "WEEK":
        setStartDate(
          getStartOfWeek(),
        );

        setEndDate(
          today,
        );

        break;


      case "MONTH":
        setStartDate(
          getStartOfMonth(),
        );

        setEndDate(
          today,
        );

        break;


      case "CUSTOM":
      default:
        break;
    }
  }


  /* =========================================
     LOAD TRANSACTIONS
  ========================================= */

  useEffect(
    () => {
      let cancelled =
        false;


      async function loadTransactions() {
        try {
          setIsLoading(
            true,
          );

          setErrorMessage(
            "",
          );


          const result =
            await window.api
              .getTransactionHistory({
                startDate,
                endDate,

                type:
                  transactionType,

                paymentMethod,

                search:
                  searchText.trim(),

                limit:
                  1000,
              });


          if (cancelled) {
            return;
          }


          setTransactions(
            Array.isArray(
              result,
            )
              ? result
              : [],
          );

        } catch (error) {
          if (cancelled) {
            return;
          }

          console.error(
            "Unable to load transaction history:",
            error,
          );

          setErrorMessage(
            error?.message ||
              "Transaction history could not be loaded.",
          );

        } finally {
          if (!cancelled) {
            setIsLoading(
              false,
            );
          }
        }
      }


      const timer =
        window.setTimeout(
          loadTransactions,
          180,
        );


      return () => {
        cancelled =
          true;

        window.clearTimeout(
          timer,
        );
      };
    },
    [
      startDate,
      endDate,
      transactionType,
      paymentMethod,
      searchText,
    ],
  );


  /* =========================================
     SUMMARY
  ========================================= */

  const summary =
    useMemo(
      () => {
        let salesCents =
          0;

        let purchasesCents =
          0;

        let expensesCents =
          0;

        let adjustmentCount =
          0;


        transactions.forEach(
          (
            transaction,
          ) => {
            switch (
              transaction.type
            ) {
              case "SALE":
                salesCents +=
                  Number(
                    transaction.amountCents ??
                      0,
                  );

                break;


              case "PURCHASE":
                purchasesCents +=
                  Number(
                    transaction.amountCents ??
                      0,
                  );

                break;


              case "EXPENSE":
                expensesCents +=
                  Number(
                    transaction.amountCents ??
                      0,
                  );

                break;


              case "INVENTORY_ADJUSTMENT":
                adjustmentCount +=
                  1;

                break;


              default:
                break;
            }
          },
        );


        return {
          totalTransactions:
            transactions.length,

          salesCents,

          purchasesCents,

          expensesCents,

          adjustmentCount,
        };
      },
      [
        transactions,
      ],
    );


  /* =========================================
     RESIZE HANDLERS
  ========================================= */

  function handleResizePointerDown(
    event,
  ) {
    event.preventDefault();

    resizeStateRef.current = {
      active: true,
      startY: event.clientY,
      startHeight: tableHeight,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    event.currentTarget.classList.add(
      "active",
    );
  }


  function handleResizePointerMove(
    event,
  ) {
    if (
      !resizeStateRef.current.active
    ) {
      return;
    }

    const {
      startY,
      startHeight,
    } = resizeStateRef.current;

    const movement =
      startY -
      event.clientY;

    const requestedHeight =
      startHeight +
      movement;

    const nextHeight =
      Math.min(
        Math.max(
          requestedHeight,
          180,
        ),
        650,
      );

    setTableHeight(
      nextHeight,
    );
  }


  function finishResize(
    event,
  ) {
    resizeStateRef.current.active =
      false;

    try {
      if (
        event.currentTarget
          .hasPointerCapture(
            event.pointerId,
          )
      ) {
        event.currentTarget
          .releasePointerCapture(
            event.pointerId,
          );
      }
    } catch {
      // Pointer capture may already be released.
    }

    event.currentTarget
      .classList
      .remove(
        "active",
      );
  }


  /* =========================================
     RENDER
  ========================================= */

  return (
    <div
      className={
        embedded
          ? "transaction-history-page transaction-history-page-embedded"
          : "transaction-history-page"
      }
    >

      {/* =====================================
          HEADER
      ===================================== */}

      <header
        className="transaction-history-header"
      >
        <div>

          {
            !embedded &&
            onBackToDashboard && (

              <button
                type="button"
                className="transaction-history-back"
                onClick={
                  onBackToDashboard
                }
              >
                ← Dashboard
              </button>
            )
          }


          <h2>
            Transaction History
          </h2>


          <p>
            Review sales, purchases,
            expenses, and inventory
            adjustments.
          </p>

        </div>
      </header>


      {/* =====================================
          SUMMARY
      ===================================== */}

      <section
        className="transaction-summary-grid"
      >

        <div
          className="transaction-summary-card"
        >
          <span>
            Transactions
          </span>

          <strong>
            {
              summary
                .totalTransactions
            }
          </strong>
        </div>


        <div
          className="transaction-summary-card"
        >
          <span>
            Sales
          </span>

          <strong>
            {
              formatMoney(
                summary
                  .salesCents,
              )
            }
          </strong>
        </div>


        <div
          className="transaction-summary-card"
        >
          <span>
            Purchases
          </span>

          <strong>
            {
              formatMoney(
                summary
                  .purchasesCents,
              )
            }
          </strong>
        </div>


        <div
          className="transaction-summary-card"
        >
          <span>
            Expenses
          </span>

          <strong>
            {
              formatMoney(
                summary
                  .expensesCents,
              )
            }
          </strong>
        </div>

      </section>


      {/* =====================================
          FILTERS
      ===================================== */}

      <section
        className="transaction-filters"
      >

        <div
          className="transaction-filter-group transaction-date-presets"
        >

          <button
            type="button"
            className={
              datePreset ===
              "TODAY"
                ? "active"
                : ""
            }
            onClick={
              () =>
                applyDatePreset(
                  "TODAY",
                )
            }
          >
            Today
          </button>


          <button
            type="button"
            className={
              datePreset ===
              "YESTERDAY"
                ? "active"
                : ""
            }
            onClick={
              () =>
                applyDatePreset(
                  "YESTERDAY",
                )
            }
          >
            Yesterday
          </button>


          <button
            type="button"
            className={
              datePreset ===
              "WEEK"
                ? "active"
                : ""
            }
            onClick={
              () =>
                applyDatePreset(
                  "WEEK",
                )
            }
          >
            This Week
          </button>


          <button
            type="button"
            className={
              datePreset ===
              "MONTH"
                ? "active"
                : ""
            }
            onClick={
              () =>
                applyDatePreset(
                  "MONTH",
                )
            }
          >
            This Month
          </button>


          <button
            type="button"
            className={
              datePreset ===
              "CUSTOM"
                ? "active"
                : ""
            }
            onClick={
              () =>
                setDatePreset(
                  "CUSTOM",
                )
            }
          >
            Custom
          </button>

        </div>


        <div
          className="transaction-filter-row"
        >

          <label>
            <span>
              From
            </span>

            <input
              type="date"
              value={
                startDate
              }
              onChange={
                (
                  event,
                ) => {
                  setDatePreset(
                    "CUSTOM",
                  );

                  setStartDate(
                    event.target
                      .value,
                  );
                }
              }
            />
          </label>


          <label>
            <span>
              To
            </span>

            <input
              type="date"
              value={
                endDate
              }
              onChange={
                (
                  event,
                ) => {
                  setDatePreset(
                    "CUSTOM",
                  );

                  setEndDate(
                    event.target
                      .value,
                  );
                }
              }
            />
          </label>


          <label>
            <span>
              Type
            </span>

            <select
              value={
                transactionType
              }
              onChange={
                (
                  event,
                ) =>
                  setTransactionType(
                    event.target
                      .value,
                  )
              }
            >
              <option value="ALL">
                All Transactions
              </option>

              <option value="SALE">
                Sales
              </option>

              <option value="PURCHASE">
                Purchases
              </option>

              <option value="EXPENSE">
                Expenses
              </option>

              <option value="INVENTORY_ADJUSTMENT">
                Inventory Adjustments
              </option>
            </select>
          </label>


          <label>
            <span>
              Payment
            </span>

            <select
              value={
                paymentMethod
              }
              onChange={
                (
                  event,
                ) =>
                  setPaymentMethod(
                    event.target
                      .value,
                  )
              }
            >
              <option value="ALL">
                All Payments
              </option>

              <option value="CASH">
                Cash
              </option>

              <option value="MPESA">
                M-Pesa
              </option>

              <option value="BANK">
                Bank
              </option>

              <option value="CREDIT">
                Credit
              </option>

              <option value="OTHER">
                Other
              </option>
            </select>
          </label>


          <label
            className="transaction-search"
          >
            <span>
              Search
            </span>

            <input
              type="search"
              placeholder="Reference, product, supplier..."
              value={
                searchText
              }
              onChange={
                (
                  event,
                ) =>
                  setSearchText(
                    event.target
                      .value,
                  )
              }
            />
          </label>

        </div>

      </section>


      {/* =====================================
          CLICK ASSISTANCE
      ===================================== */}

      <div
        className="transaction-click-hint"
      >
        <span
          className="transaction-click-hint-icon"
        >
          ⓘ
        </span>

        <span>
          Click any transaction row to
          view full details.
        </span>
      </div>


      {/* =====================================
          RESIZABLE TABLE STAGE
      ===================================== */}

      <div
        className="transaction-table-stage"
      >

        <section
          ref={
            tableResizeRef
          }
          className="transaction-table-card"
          style={{
            height:
              `${tableHeight}px`,
          }}
        >

          <div
            className="transaction-table-resize-handle"

            onPointerDown={
              handleResizePointerDown
            }

            onPointerMove={
              handleResizePointerMove
            }

            onPointerUp={
              finishResize
            }

            onPointerCancel={
              finishResize
            }

            role="separator"
            aria-label="Resize transaction table"
            aria-orientation="horizontal"
          >

            <span
              className="transaction-resize-line"
            />

            <span
              className="transaction-resize-text"
            >
              ↕ Drag up to expand
            </span>

            <span
              className="transaction-resize-line"
            />

          </div>


          {
            isLoading && (

              <div
                className="transaction-status"
              >
                Loading transactions...
              </div>
            )
          }


          {
            !isLoading &&
            errorMessage && (

              <div
                className="transaction-status transaction-error"
              >
                {
                  errorMessage
                }
              </div>
            )
          }


          {
            !isLoading &&
            !errorMessage &&
            transactions.length ===
              0 && (

              <div
                className="transaction-status"
              >
                No transactions were found
                for the selected filters.
              </div>
            )
          }


          {
            !isLoading &&
            !errorMessage &&
            transactions.length >
              0 && (

              <div
                className="transaction-table-wrapper"
              >

                <table
                  className="transaction-table"
                >

                  <thead>

                    <tr>

                      <th>
                        Date / Time
                      </th>

                      <th>
                        Type
                      </th>

                      <th>
                        Reference
                      </th>

                      <th>
                        Description
                      </th>

                      <th>
                        Payment
                      </th>

                      <th>
                        Amount
                      </th>

                      <th
                        className="transaction-details-column"
                      >
                        Details
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {
                      transactions.map(
                        (
                          transaction,
                        ) => (

                          <tr
                            key={
                              `${transaction.type}-${transaction.id}`
                            }

                            onClick={
                              () =>
                                setSelectedTransaction(
                                  transaction,
                                )
                            }
                          >

                            <td>
                              {
                                formatDateTime(
                                  transaction
                                    .date,
                                )
                              }
                            </td>


                            <td>

                              <span
                                className={`transaction-type-badge ${
                                  transaction.type
                                    ?.toLowerCase()
                                    .replaceAll(
                                      "_",
                                      "-",
                                    )
                                }`}
                              >
                                {
                                  formatTransactionType(
                                    transaction
                                      .type,
                                  )
                                }
                              </span>

                            </td>


                            <td>

                              <span
                                className="transaction-reference"
                                title={
                                  transaction.reference ||
                                  ""
                                }
                              >
                                {
                                  transaction.reference ||
                                  "—"
                                }
                              </span>

                            </td>


                            <td
                              title={
                                transaction
                                  .description ||
                                transaction
                                  .productName ||
                                ""
                              }
                            >
                              {
                                transaction
                                  .description ||
                                transaction
                                  .productName ||
                                "—"
                              }
                            </td>


                            <td>
                              {
                                formatPaymentMethod(
                                  transaction
                                    .paymentMethod,
                                )
                              }
                            </td>


                            <td>

                              {
                                transaction
                                  .amountCents ===
                                null
                                  ? (
                                    <span
                                      className="transaction-no-amount"
                                    >
                                      —
                                    </span>
                                  )
                                  : (
                                    <strong
                                      className={
                                        transaction
                                          .direction ===
                                        "IN"
                                          ? "transaction-amount-in"
                                          : "transaction-amount-out"
                                      }
                                    >
                                      {
                                        transaction
                                          .direction ===
                                        "IN"
                                          ? "+"
                                          : "-"
                                      }

                                      {
                                        formatMoney(
                                          transaction
                                            .amountCents,
                                        )
                                      }
                                    </strong>
                                  )
                              }

                            </td>


                            <td
                              className="transaction-row-details"
                            >
                              <span>
                                View ›
                              </span>
                            </td>

                          </tr>
                        ),
                      )
                    }

                  </tbody>

                </table>

              </div>
            )
          }

        </section>

      </div>


      {/* =====================================
          DETAILS SIDE PANEL
      ===================================== */}

      {
        selectedTransaction && (

          <div
            className="transaction-details-backdrop"

            onMouseDown={
              (
                event,
              ) => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  setSelectedTransaction(
                    null,
                  );
                }
              }
            }
          >

            <div
              className="transaction-details-panel"
            >

              <div
                className="transaction-details-header"
              >

                <div>

                  <h3>
                    {
                      formatTransactionType(
                        selectedTransaction
                          .type,
                      )
                    }
                  </h3>


                  <p>
                    {
                      selectedTransaction
                        .reference ||
                      selectedTransaction
                        .id
                    }
                  </p>

                </div>


                <button
                  type="button"

                  onClick={
                    () =>
                      setSelectedTransaction(
                        null,
                      )
                  }
                >
                  ×
                </button>

              </div>


              <div
                className="transaction-details-body"
              >

                <DetailRow
                  label="Date / Time"

                  value={
                    formatDateTime(
                      selectedTransaction
                        .date,
                    )
                  }
                />


                <DetailRow
                  label="Type"

                  value={
                    formatTransactionType(
                      selectedTransaction
                        .type,
                    )
                  }
                />


                <DetailRow
                  label="Reference"

                  value={
                    selectedTransaction
                      .reference ||
                    "—"
                  }
                />


                <DetailRow
                  label="Description"

                  value={
                    selectedTransaction
                      .description ||
                    selectedTransaction
                      .productName ||
                    "—"
                  }
                />


                <DetailRow
                  label="Payment"

                  value={
                    formatPaymentMethod(
                      selectedTransaction
                        .paymentMethod,
                    )
                  }
                />


                {
                  selectedTransaction
                    .amountCents !==
                    null && (

                    <DetailRow
                      label="Amount"

                      value={
                        formatMoney(
                          selectedTransaction
                            .amountCents,
                        )
                      }
                    />
                  )
                }


                {
                  selectedTransaction
                    .category && (

                    <DetailRow
                      label="Category"

                      value={
                        selectedTransaction
                          .category
                      }
                    />
                  )
                }


                {
                  selectedTransaction
                    .productName && (

                    <DetailRow
                      label="Product"

                      value={
                        selectedTransaction
                          .productName
                      }
                    />
                  )
                }


                {
                  selectedTransaction
                    .previousQuantity !==
                    undefined && (

                    <DetailRow
                      label="Previous Quantity"

                      value={
                        selectedTransaction
                          .previousQuantity
                      }
                    />
                  )
                }


                {
                  selectedTransaction
                    .quantityChange !==
                    undefined && (

                    <DetailRow
                      label="Quantity Change"

                      value={
                        selectedTransaction
                          .quantityChange >
                        0
                          ? `+${selectedTransaction.quantityChange}`
                          : selectedTransaction
                              .quantityChange
                      }
                    />
                  )
                }


                {
                  selectedTransaction
                    .resultingQuantity !==
                    undefined && (

                    <DetailRow
                      label="Resulting Quantity"

                      value={
                        selectedTransaction
                          .resultingQuantity
                      }
                    />
                  )
                }


                {
                  selectedTransaction
                    .notes && (

                    <div
                      className="transaction-details-notes"
                    >
                      <span>
                        Notes
                      </span>

                      <p>
                        {
                          selectedTransaction
                            .notes
                        }
                      </p>
                    </div>
                  )
                }

              </div>

            </div>

          </div>
        )
      }

    </div>
  );
}


/* =========================================
   DETAIL ROW
========================================= */

function DetailRow({
  label,
  value,
}) {
  return (
    <div
      className="transaction-detail-row"
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}


export default TransactionHistory;