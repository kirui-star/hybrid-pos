import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./FinancialReport.css";


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
   FORMATTERS
========================================= */

function formatMoney(cents) {
  const amount =
    Number(
      cents ?? 0,
    ) / 100;

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


function formatType(type) {
  switch (type) {
    case "SALE":
      return "Sale";

    case "EXPENSE":
      return "Expense";

    case "PURCHASE":
      return "Purchase";

    default:
      return type || "Transaction";
  }
}


function formatPaymentMethod(method) {
  switch (method) {
    case "CASH":
      return "Cash";

    case "MPESA":
    case "MOBILE_MONEY":
      return "M-Pesa";

    case "BANK":
      return "Bank";

    case "CARD":
      return "Card";

    case "CREDIT":
      return "Credit";

    case "OTHER":
      return "Other";

    case "SPLIT":
      return "Split";

    default:
      return "—";
  }
}


/* =========================================
   EMPTY REPORT
========================================= */

function createEmptyReport() {
  return {
    summary: {
      salesCents: 0,
      cogsCents: 0,
      grossProfitCents: 0,
      operatingExpensesCents: 0,
      netProfitCents: 0,
      purchasesCents: 0,
      saleCount: 0,
      expenseCount: 0,
      purchaseCount: 0,
    },

    sales: {
      subtotalCents: 0,
      discountCents: 0,
      taxCents: 0,
      totalSalesCents: 0,
    },

    expenses: {
      totalExpensesCents: 0,
      cashExpensesCents: 0,
      mpesaExpensesCents: 0,
      bankExpensesCents: 0,
      otherExpensesCents: 0,
    },

    purchases: {
      subtotalCents: 0,
      discountCents: 0,
      totalPurchasesCents: 0,
      cashPurchasesCents: 0,
      mpesaPurchasesCents: 0,
      bankPurchasesCents: 0,
      creditPurchasesCents: 0,
      otherPurchasesCents: 0,
    },

    payments: {
      cashSalesCents: 0,
      mpesaSalesCents: 0,
      cardSalesCents: 0,
      otherSalesCents: 0,
      totalPaymentsCents: 0,
    },

    cashPosition: {
      openingCashCents: null,
      cashSalesCents: 0,
      cashExpensesCents: 0,
      cashPurchasesCents: 0,
      netCashMovementCents: 0,
      expectedCashCents: null,
    },

    dailyTrend: [],

    activity: [],
  };
}


/* =========================================
   COMPONENT
========================================= */

function FinancialReport({
  embedded = false,
  onBackToDashboard,
}) {

  const [
    report,
    setReport,
  ] = useState(
    createEmptyReport(),
  );


  const [
    isLoading,
    setIsLoading,
  ] = useState(true);


  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");


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


  /* =========================================
     FINANCIAL ACTIVITY RESIZE
  ========================================= */

  const [
    activityHeight,
    setActivityHeight,
  ] = useState(320);


  const activityResizeRef =
    useRef({
      active: false,
      startY: 0,
      startHeight: 320,
    });


  function handleActivityResizeStart(
    event,
  ) {
    event.preventDefault();

    event.currentTarget
      .setPointerCapture(
        event.pointerId,
      );

    activityResizeRef.current = {
      active: true,
      startY: event.clientY,
      startHeight:
        activityHeight,
    };

    event.currentTarget
      .classList.add(
        "active",
      );
  }


  function handleActivityResizeMove(
    event,
  ) {
    if (
      !activityResizeRef
        .current
        .active
    ) {
      return;
    }


    const {
      startY,
      startHeight,
    } =
      activityResizeRef
        .current;


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
          220,
        ),
        650,
      );


    setActivityHeight(
      nextHeight,
    );
  }


  function handleActivityResizeEnd(
    event,
  ) {
    activityResizeRef
      .current
      .active = false;


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
      // Ignore pointer-capture cleanup errors.
    }


    event.currentTarget
      .classList.remove(
        "active",
      );
  }


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
     LOAD REPORT
  ========================================= */

  useEffect(
    () => {
      let cancelled =
        false;


      async function loadReport() {
        try {
          setIsLoading(
            true,
          );

          setErrorMessage(
            "",
          );


          const result =
            await window.api
              .getFinancialReport({
                startDate,
                endDate,
                limit: 1500,
              });


          if (cancelled) {
            return;
          }


          setReport(
            result ||
              createEmptyReport(),
          );

        } catch (error) {
          if (cancelled) {
            return;
          }


          console.error(
            "Unable to load financial report:",
            error,
          );


          setErrorMessage(
            error?.message ||
              "Financial report could not be loaded.",
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
          loadReport,
          150,
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
    ],
  );


  /* =========================================
     REPORT REFERENCES
  ========================================= */

  const summary =
    report?.summary ||
    createEmptyReport().summary;


  const sales =
    report?.sales ||
    createEmptyReport().sales;


  const expenses =
    report?.expenses ||
    createEmptyReport().expenses;


  const purchases =
    report?.purchases ||
    createEmptyReport().purchases;


  const payments =
    report?.payments ||
    createEmptyReport().payments;


  const cashPosition =
    report?.cashPosition ||
    createEmptyReport().cashPosition;


  const activity =
    Array.isArray(
      report?.activity,
    )
      ? report.activity
      : [];


  /* =========================================
     PROFIT MARGIN
  ========================================= */

  const grossMargin =
    useMemo(
      () => {
        const salesValue =
          Number(
            summary.salesCents ??
              0,
          );

        if (
          salesValue <= 0
        ) {
          return 0;
        }

        return (
          Number(
            summary.grossProfitCents ??
              0,
          ) /
          salesValue
        ) * 100;
      },
      [
        summary.salesCents,
        summary.grossProfitCents,
      ],
    );


  /* =========================================
     RENDER
  ========================================= */

  return (
    <div
      className={
        embedded
          ? "financial-report-page financial-report-page-embedded"
          : "financial-report-page"
      }
    >

      {/* =====================================
          HEADER
      ===================================== */}

      <header
        className="financial-report-header"
      >

        <div>

          {
            !embedded &&
            onBackToDashboard && (

              <button
                type="button"
                className="financial-report-back"
                onClick={
                  onBackToDashboard
                }
              >
                ← Dashboard
              </button>
            )
          }


          <h2>
            Financial Report
          </h2>


          <p>
            Review sales, profit,
            expenses, purchases,
            and payment performance.
          </p>

        </div>

      </header>


      {/* =====================================
          DATE FILTERS
      ===================================== */}

      <section
        className="financial-report-filters"
      >

        <div
          className="financial-report-presets"
        >

          <button
            type="button"
            className={
              datePreset === "TODAY"
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
              datePreset === "YESTERDAY"
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
              datePreset === "WEEK"
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
              datePreset === "MONTH"
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
              datePreset === "CUSTOM"
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
          className="financial-report-date-range"
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

        </div>

      </section>


      {
        errorMessage && (

          <div
            className="financial-report-error"
          >
            {errorMessage}
          </div>
        )
      }


      {/* =====================================
          SUMMARY CARDS
      ===================================== */}

      <section
        className="financial-summary-grid"
      >

        <SummaryCard
          label="Sales"
          value={
            formatMoney(
              summary.salesCents,
            )
          }
          subtext={
            `${summary.saleCount || 0} sales`
          }
        />


        <SummaryCard
          label="COGS"
          value={
            formatMoney(
              summary.cogsCents,
            )
          }
          subtext="Cost of goods sold"
        />


        <SummaryCard
          label="Gross Profit"
          value={
            formatMoney(
              summary.grossProfitCents,
            )
          }
          subtext={
            `${grossMargin.toFixed(1)}% margin`
          }
          tone="positive"
        />


        <SummaryCard
          label="Expenses"
          value={
            formatMoney(
              summary.operatingExpensesCents,
            )
          }
          subtext={
            `${summary.expenseCount || 0} expenses`
          }
          tone="negative"
        />


        <SummaryCard
          label="Net Profit"
          value={
            formatMoney(
              summary.netProfitCents,
            )
          }
          subtext="After operating expenses"
          tone={
            summary.netProfitCents >= 0
              ? "positive"
              : "negative"
          }
        />


        <SummaryCard
          label="Stock Purchases"
          value={
            formatMoney(
              summary.purchasesCents,
            )
          }
          subtext={
            `${summary.purchaseCount || 0} purchases`
          }
        />

      </section>


      {/* =====================================
          REPORT BREAKDOWN
      ===================================== */}

      <section
        className="financial-report-breakdown-grid"
      >

        {/* PROFIT & LOSS */}

        <div
          className="financial-report-card"
        >

          <div
            className="financial-report-card-header"
          >
            <h3>
              Profit & Loss
            </h3>

            <span>
              Selected period
            </span>
          </div>


          <div
            className="financial-breakdown-list"
          >

            <BreakdownRow
              label="Sales"
              value={
                formatMoney(
                  summary.salesCents,
                )
              }
            />


            <BreakdownRow
              label="Cost of Goods Sold"
              value={
                `-${formatMoney(
                  summary.cogsCents,
                )}`
              }
            />


            <BreakdownRow
              label="Gross Profit"
              value={
                formatMoney(
                  summary.grossProfitCents,
                )
              }
              strong
            />


            <BreakdownRow
              label="Operating Expenses"
              value={
                `-${formatMoney(
                  summary.operatingExpensesCents,
                )}`
              }
            />


            <BreakdownRow
              label="Net Profit"
              value={
                formatMoney(
                  summary.netProfitCents,
                )
              }
              strong
              total
            />

          </div>

        </div>


        {/* PAYMENT SUMMARY */}

        <div
          className="financial-report-card"
        >

          <div
            className="financial-report-card-header"
          >
            <h3>
              Payment Summary
            </h3>

            <span>
              Sales collected
            </span>
          </div>


          <div
            className="financial-breakdown-list"
          >

            <BreakdownRow
              label="Cash"
              value={
                formatMoney(
                  payments.cashSalesCents,
                )
              }
            />


            <BreakdownRow
              label="M-Pesa"
              value={
                formatMoney(
                  payments.mpesaSalesCents,
                )
              }
            />


            <BreakdownRow
              label="Card"
              value={
                formatMoney(
                  payments.cardSalesCents,
                )
              }
            />


            <BreakdownRow
              label="Other"
              value={
                formatMoney(
                  payments.otherSalesCents,
                )
              }
            />


            <BreakdownRow
              label="Total"
              value={
                formatMoney(
                  payments.totalPaymentsCents,
                )
              }
              strong
              total
            />

          </div>

        </div>


        {/* CASH POSITION */}

        <div
          className="financial-report-card"
        >

          <div
            className="financial-report-card-header"
          >
            <h3>
              Cash Position
            </h3>

            <span>
              Cash movement
            </span>
          </div>


          <div
            className="financial-breakdown-list"
          >

            <BreakdownRow
              label="Opening Cash"
              value={
                cashPosition.openingCashCents === null
                  ? "Not available"
                  : formatMoney(
                      cashPosition.openingCashCents,
                    )
              }
            />


            <BreakdownRow
              label="Cash Sales"
              value={
                formatMoney(
                  cashPosition.cashSalesCents,
                )
              }
            />


            <BreakdownRow
              label="Cash Expenses"
              value={
                `-${formatMoney(
                  cashPosition.cashExpensesCents,
                )}`
              }
            />


            <BreakdownRow
              label="Cash Stock Purchases"
              value={
                `-${formatMoney(
                  cashPosition.cashPurchasesCents,
                )}`
              }
            />


            <BreakdownRow
              label="Net Cash Movement"
              value={
                formatMoney(
                  cashPosition.netCashMovementCents,
                )
              }
              strong
              total
            />

          </div>

        </div>


        {/* SALES DETAILS */}

        <div
          className="financial-report-card"
        >

          <div
            className="financial-report-card-header"
          >
            <h3>
              Sales Details
            </h3>

            <span>
              Revenue breakdown
            </span>
          </div>


          <div
            className="financial-breakdown-list"
          >

            <BreakdownRow
              label="Subtotal"
              value={
                formatMoney(
                  sales.subtotalCents,
                )
              }
            />


            <BreakdownRow
              label="Discounts"
              value={
                `-${formatMoney(
                  sales.discountCents,
                )}`
              }
            />


            <BreakdownRow
              label="Tax"
              value={
                formatMoney(
                  sales.taxCents,
                )
              }
            />


            <BreakdownRow
              label="Final Sales"
              value={
                formatMoney(
                  sales.totalSalesCents,
                )
              }
              strong
              total
            />

          </div>

        </div>

      </section>


      {/* =====================================
          ACTIVITY TABLE
      ===================================== */}

      <div
        className="financial-activity-stage"
      >
        <section
          className="financial-activity-card"
          style={{
            height:
              `${activityHeight}px`,
          }}
        >

          <div
            className="financial-activity-resize-handle"
            onPointerDown={
              handleActivityResizeStart
            }
            onPointerMove={
              handleActivityResizeMove
            }
            onPointerUp={
              handleActivityResizeEnd
            }
            onPointerCancel={
              handleActivityResizeEnd
            }
            role="separator"
            aria-label="Resize Financial Activity"
            aria-orientation="horizontal"
          >
            <span
              className="financial-activity-resize-line"
            />

            <strong>
              ↕ Drag up to expand
            </strong>

            <span
              className="financial-activity-resize-line"
            />
          </div>


        <div
          className="financial-activity-header"
        >

          <div>
            <h3>
              Financial Activity
            </h3>

            <p>
              Detailed sales,
              purchases, and expenses
              for the selected period.
            </p>
          </div>


          <span
            className="financial-activity-count"
          >
            {
              activity.length
            }{" "}
            records
          </span>

        </div>


        <div
          className="financial-table-wrapper"
        >

          {
            isLoading
              ? (
                <div
                  className="financial-report-status"
                >
                  Loading financial report...
                </div>
              )
              : activity.length === 0
                ? (
                  <div
                    className="financial-report-status"
                  >
                    No financial activity
                    was found for the
                    selected period.
                  </div>
                )
                : (

                  <table
                    className="financial-table"
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
                          Sales
                        </th>

                        <th>
                          COGS
                        </th>

                        <th>
                          Expense
                        </th>

                        <th>
                          Purchase
                        </th>

                        <th>
                          Profit
                        </th>
                      </tr>
                    </thead>


                    <tbody>

                      {
                        activity.map(
                          (
                            item,
                          ) => (

                            <tr
                              key={
                                `${item.type}-${item.id}`
                              }
                            >

                              <td>
                                {
                                  formatDateTime(
                                    item.date,
                                  )
                                }
                              </td>


                              <td>
                                <span
                                  className={`financial-type-badge ${
                                    item.type
                                      ?.toLowerCase()
                                  }`}
                                >
                                  {
                                    formatType(
                                      item.type,
                                    )
                                  }
                                </span>
                              </td>


                              <td>
                                <span
                                  className="financial-reference"
                                  title={
                                    item.reference ||
                                    ""
                                  }
                                >
                                  {
                                    item.reference ||
                                    "—"
                                  }
                                </span>
                              </td>


                              <td
                                title={
                                  item.description ||
                                  ""
                                }
                              >
                                {
                                  item.description ||
                                  "—"
                                }
                              </td>


                              <td>
                                {
                                  formatPaymentMethod(
                                    item.paymentMethod,
                                  )
                                }
                              </td>


                              <td>
                                {
                                  item.salesCents
                                    ? formatMoney(
                                        item.salesCents,
                                      )
                                    : "—"
                                }
                              </td>


                              <td>
                                {
                                  item.cogsCents
                                    ? formatMoney(
                                        item.cogsCents,
                                      )
                                    : "—"
                                }
                              </td>


                              <td>
                                {
                                  item.expenseCents
                                    ? formatMoney(
                                        item.expenseCents,
                                      )
                                    : "—"
                                }
                              </td>


                              <td>
                                {
                                  item.purchaseCents
                                    ? formatMoney(
                                        item.purchaseCents,
                                      )
                                    : "—"
                                }
                              </td>


                              <td>
                                <strong
                                  className={
                                    item.profitCents >= 0
                                      ? "financial-profit-positive"
                                      : "financial-profit-negative"
                                  }
                                >
                                  {
                                    formatMoney(
                                      item.profitCents,
                                    )
                                  }
                                </strong>
                              </td>

                            </tr>
                          ),
                        )
                      }

                    </tbody>

                  </table>
                )
          }

        </div>

      </section>
      </div>

    </div>
  );
}


/* =========================================
   SUMMARY CARD
========================================= */

function SummaryCard({
  label,
  value,
  subtext,
  tone = "",
}) {
  return (
    <div
      className={`financial-summary-card ${
        tone
          ? `financial-summary-${tone}`
          : ""
      }`}
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

      <small>
        {subtext}
      </small>
    </div>
  );
}


/* =========================================
   BREAKDOWN ROW
========================================= */

function BreakdownRow({
  label,
  value,
  strong = false,
  total = false,
}) {
  return (
    <div
      className={`financial-breakdown-row ${
        total
          ? "financial-breakdown-total"
          : ""
      }`}
    >
      <span>
        {label}
      </span>

      {
        strong
          ? (
            <strong>
              {value}
            </strong>
          )
          : (
            <span>
              {value}
            </span>
          )
      }
    </div>
  );
}


export default FinancialReport;