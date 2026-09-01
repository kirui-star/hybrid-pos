import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  dashboardService,
} from "../../services/dashboardService";

import "./Dashboard.css";

import Products from "../products/Products";
import AddProductModal from "../products/AddProductModal";
import ReceiveStockModal from "../products/ReceiveStockModal";
import ExpenseModal from "../expenses/ExpenseModal";
import TransactionHistory from "../transactions/TransactionHistory";
import FinancialReport from "../reports/FinancialReport.jsx";

function formatMoney(cents) {
  const numericCents =
    Number(cents);

  if (
    !Number.isFinite(
      numericCents,
    )
  ) {
    return "Ksh 0.00";
  }

  return `Ksh ${(
    numericCents / 100
  ).toFixed(2)}`;
}


function formatSaleDate(
  value,
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(value);
  }

  return date.toLocaleString(
    [],
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}


function Dashboard({
  onLogout,
  onOpenPOS,
  onOpenProducts,
}) {
  const [
    summary,
    setSummary,
  ] = useState({
    todaySalesCents: 0,
    transactionCount: 0,
    lowStockCount: 0,
    inventoryValueCents: 0,
  });


  const [
    recentSales,
    setRecentSales,
  ] = useState([]);


  const [
    inventoryAlerts,
    setInventoryAlerts,
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
  activeWorkspace,
  setActiveWorkspace,
] = useState("HOME");

const [
  isAddProductModalOpen,
  setIsAddProductModalOpen,
] = useState(false);

const [
  inventoryRefreshKey,
  setInventoryRefreshKey,
] = useState(0);

const [
  inventoryProducts,
  setInventoryProducts,
] = useState([]);

const [
  inventoryLoading,
  setInventoryLoading,
] = useState(false);

const [
  inventorySearch,
  setInventorySearch,
] = useState("");

const [
  isReceiveStockModalOpen,
  setIsReceiveStockModalOpen,
] = useState(false);

const [
  isExpenseModalOpen,
  setIsExpenseModalOpen,
] = useState(false);
  /* ========================================
     LOAD DASHBOARD
  ======================================== */

  const loadDashboard =
    useCallback(
      async () => {
        try {
          setIsLoading(true);
          setErrorMessage("");

          const data =
            await dashboardService
              .getData();


          setSummary({
            todaySalesCents:
              Number(
                data?.summary
                  ?.todaySalesCents ??
                  0,
              ),

            transactionCount:
              Number(
                data?.summary
                  ?.transactionCount ??
                  0,
              ),

            lowStockCount:
              Number(
                data?.summary
                  ?.lowStockCount ??
                  0,
              ),

            inventoryValueCents:
              Number(
                data?.summary
                  ?.inventoryValueCents ??
                  0,
              ),
          });


          setRecentSales(
            Array.isArray(
              data?.recentSales,
            )
              ? data.recentSales
              : [],
          );


          setInventoryAlerts(
            Array.isArray(
              data?.inventoryAlerts,
            )
              ? data.inventoryAlerts
              : [],
          );

        } catch (error) {
          console.error(
            "Unable to load dashboard:",
            error,
          );

          setErrorMessage(
            error?.message ||
              "Dashboard data could not be loaded.",
          );

        } finally {
          setIsLoading(false);
        }
      },
      [],
    );

    const loadInventoryProducts =
  useCallback(
    async () => {
      try {
        setInventoryLoading(true);

        const products =
          await window.api.getProducts();

        setInventoryProducts(
          Array.isArray(products)
            ? products
            : [],
        );

      } catch (error) {
        console.error(
          "Unable to load inventory:",
          error,
        );

      } finally {
        setInventoryLoading(false);
      }
    },
    [],
  );


  useEffect(() => {
    loadDashboard();
  }, [
    loadDashboard,
  ]);


  const filteredInventoryProducts =
  inventoryProducts.filter(
    (product) => {
      const search =
        inventorySearch
          .trim()
          .toLowerCase();

      if (!search) {
        return true;
      }

      return (
        String(
          product.name ?? "",
        )
          .toLowerCase()
          .includes(search) ||

        String(
          product.sku ?? "",
        )
          .toLowerCase()
          .includes(search) ||

        String(
          product.barcode ?? "",
        )
          .toLowerCase()
          .includes(search)
      );
    },
  );

  /* ========================================
     RENDER
  ======================================== */

  return (
    <div className="dashboard-page">

      {/* =====================================
          SIDEBAR
      ===================================== */}

      <aside className="sidebar">

        <div className="sidebar-brand">

          <h2>
            Hybrid POS
          </h2>

          <p>
            Retail Management
          </p>

        </div>


        <nav className="sidebar-nav">

        <button
  className={
    activeWorkspace === "HOME"
      ? "nav-button active"
      : "nav-button"
  }
  type="button"
  onClick={() =>
    setActiveWorkspace(
      "HOME",
    )
  }
>
  Dashboard
</button>


          <button
            className="nav-button"
            type="button"
            onClick={
              onOpenPOS
            }
          >
            Point of Sale
          </button>


          <button
            className="nav-button"
            type="button"
            onClick={
              onOpenProducts
            }
          >
            Products
          </button>


    <button
  className="nav-button"
  type="button"
  onClick={() =>
    setIsAddProductModalOpen(true)
  }
>
  Add Product
</button>


        <button
  className={
    activeWorkspace === "INVENTORY"
      ? "nav-button active"
      : "nav-button"
  }
  type="button"
  onClick={async () => {

    await loadInventoryProducts();

    setActiveWorkspace(
      "INVENTORY",
    );
  }}
>
  Inventory
</button>


<button
  className={
    activeWorkspace === "TRANSACTIONS"
      ? "nav-button active"
      : "nav-button"
  }
  type="button"
  onClick={() =>
    setActiveWorkspace(
      "TRANSACTIONS",
    )
  }
>
  Transactions
</button>

<button
  type="button"
  className={
    activeWorkspace === "FINANCIAL_REPORT"
      ? "nav-button active"
      : "nav-button"
  }
  onClick={
    () =>
      setActiveWorkspace(
        "FINANCIAL_REPORT",
      )
  }
>
  Financial Report
</button>

          <button
            className="nav-button"
            type="button"
          >
            Suppliers
          </button>


          <button
            className="nav-button"
            type="button"
          >
            Reports
          </button>


          <button
            className="nav-button"
            type="button"
          >
            Users
          </button>


          <button
            className="nav-button"
            type="button"
          >
            Settings
          </button>

        </nav>


        <button
          className="logout-button"
          type="button"
          onClick={
            onLogout
          }
        >
          Logout
        </button>

      </aside>


      {/* =====================================
          MAIN
      ===================================== */}

      <main className="dashboard-main">

        {/* ===================================
            HEADER
        =================================== */}

       <header className="dashboard-header">

  <div>

    <h1>
      {
        activeWorkspace === "TRANSACTIONS"
          ? "Transaction History"
          : activeWorkspace === "INVENTORY"
            ? "Inventory"
            : "Dashboard"
      }
    </h1>


    <p>
      {
        activeWorkspace === "TRANSACTIONS"
          ? "Review sales, purchases, expenses, and inventory activity."
          : activeWorkspace === "INVENTORY"
            ? "View and manage current stock."
            : "Welcome back, Administrator"
      }
    </p>

  </div>


  <div className="header-status">

    <span className="status-dot" />

    Offline Ready

  </div>

</header>


        {/* ===================================
            ERROR
        =================================== */}

        {errorMessage && (

          <div className="dashboard-error">

            <span>
              {errorMessage}
            </span>

            <button
              type="button"
              onClick={
                loadDashboard
              }
            >
              Retry
            </button>

          </div>

        )}
{activeWorkspace === "HOME" && (
  <>

        {/* ===================================
            SUMMARY CARDS
        =================================== */}

  
        <section className="summary-grid">

          <article className="summary-card">

            <p>
              Today's Sales
            </p>

            <h2>
              {isLoading
                ? "..."
                : formatMoney(
                    summary
                      .todaySalesCents,
                  )}
            </h2>

            <span>
              {summary
                .transactionCount > 0
                ? `${summary.transactionCount} transaction${
                    summary.transactionCount ===
                    1
                      ? ""
                      : "s"
                  } today`
                : "No sales recorded"}
            </span>

          </article>


          <article className="summary-card">

            <p>
              Transactions
            </p>

            <h2>
              {isLoading
                ? "..."
                : summary
                    .transactionCount}
            </h2>

            <span>
              Today's transactions
            </span>

          </article>


          <article className="summary-card">

            <p>
              Low Stock
            </p>

            <h2>
              {isLoading
                ? "..."
                : summary
                    .lowStockCount}
            </h2>

            <span>
              {summary
                .lowStockCount === 1
                ? "Product needs attention"
                : "Products need attention"}
            </span>

          </article>


          <article className="summary-card">

            <p>
              Inventory Value
            </p>

            <h2>
              {isLoading
                ? "..."
                : formatMoney(
                    summary
                      .inventoryValueCents,
                  )}
            </h2>

            <span>
              Current stock value
            </span>

          </article>

        </section>
 </>
)}
        {/* ===================================
            QUICK ACTIONS
        =================================== */}

        <section className="dashboard-panel">

          <div className="panel-heading">

            <div>

              <h2>
                Quick Actions
              </h2>

              <p>
                Frequently used store operations
              </p>

            </div>


            <button
              type="button"
              className="dashboard-refresh-button"
              onClick={
                loadDashboard
              }
              disabled={
                isLoading
              }
            >
              {isLoading
                ? "Refreshing..."
                : "Refresh"}
            </button>

          </div>


          <div className="quick-actions">

            <button
              className="action-button primary"
              type="button"
              onClick={
                onOpenPOS
              }
            >
              New Sale
            </button>


         <button
  className="action-button"
  type="button"
  onClick={() =>
    setIsAddProductModalOpen(true)
  }
>
  Add Product
</button>


          <button
  className="action-button"
  type="button"
  onClick={() =>
    setIsReceiveStockModalOpen(
      true,
    )
  }
>
  Receive Stock
</button>

<button
  className="action-button"
  type="button"
  onClick={
    () =>
      setIsExpenseModalOpen(
        true,
      )
  }
>
  Add Expense
</button>

<button
  className="action-button"
  type="button"
  onClick={async () => {
    await loadInventoryProducts();

    setActiveWorkspace(
      "INVENTORY",
    );
  }}
>
  View Inventory
</button>


           <button
  className="action-button"
  type="button"
  onClick={() =>
    setActiveWorkspace(
      "TRANSACTIONS",
    )
  }
>
  Transaction History
</button>

<button
  type="button"
  className="action-button"
  onClick={
    () =>
      setActiveWorkspace(
        "FINANCIAL_REPORT",
      )
  }
>
  Financial Report
</button>

          </div>

        </section>


        {/* ===================================
            LOWER GRID
        =================================== */}

     {activeWorkspace === "HOME" && (
  <section className="dashboard-lower-grid">
{/* =================================
    RECENT SALES
================================= */}

<article className="dashboard-panel">

  <div className="panel-heading">

    <div>
      <h2>
        Recent Sales
      </h2>

      <p>
        Latest completed transactions.
      </p>
    </div>

  </div>


  {isLoading ? (

    <div className="empty-state">
      <p>
        Loading recent sales...
      </p>
    </div>

  ) : recentSales.length === 0 ? (

    <div className="empty-state">
      <p>
        No sales have been recorded yet.
      </p>
    </div>

  ) : (

    <div className="recent-sales-table-wrapper">

      <table className="recent-sales-table">

        <thead>
          <tr>
            <th>Sale #</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Time</th>
            <th>Action</th>
          </tr>
        </thead>


        <tbody>

          {recentSales.map(
            (sale) => (

              <tr key={sale.id}>

                <td className="recent-sale-number">
                  {sale.sale_number || "—"}
                </td>


                <td className="recent-sale-amount">
                  {formatMoney(
                    sale.total_cents,
                  )}
                </td>


                <td>
                  {sale.payment_method === "MPESA"
                    ? "M-Pesa"
                    : sale.payment_method === "SPLIT"
                      ? "Split"
                      : sale.payment_method === "CASH"
                        ? "Cash"
                        : sale.payment_method || "—"}
                </td>


                <td>
                  {sale.completed_at
                    ? new Date(
                        sale.completed_at,
                      ).toLocaleTimeString(
                        [],
                        {
                          hour: "numeric",
                          minute: "2-digit",
                        },
                      )
                    : "—"}
                </td>


                <td>
                  <button
                    className="print-receipt-button"
                    type="button"
                  >
                    Print Receipt
                  </button>
                </td>

              </tr>

            ),
          )}

        </tbody>

      </table>

    </div>

  )}

</article>


          {/* =================================
              INVENTORY ALERTS
          ================================= */}
{/* =================================
    INVENTORY ALERTS
================================= */}

<article className="dashboard-panel">

  <div className="panel-heading">

    <div>
      <h2>
        Inventory Alerts
      </h2>

      <p>
        Low-stock and out-of-stock products.
      </p>
    </div>

  </div>


  {isLoading ? (

    <div className="empty-state">
      <p>
        Loading inventory alerts...
      </p>
    </div>

  ) : inventoryAlerts.length === 0 ? (

    <div className="empty-state">
      <p>
        No inventory alerts at this time.
      </p>
    </div>

  ) : (

    <div className="inventory-alert-table-wrapper">

     <table className="inventory-alert-table">

  <thead>
    <tr>
      <th>Product</th>
      <th>Qty</th>
    </tr>
  </thead>

  <tbody>

    {inventoryAlerts.map(
      (product) => {

        const quantity =
          Number(
            product.inventory_quantity ?? 0,
          );

        return (
          <tr key={product.id}>

            <td className="inventory-alert-product">
              {product.name}
            </td>

            <td className="inventory-alert-quantity">
              {quantity}
            </td>

          </tr>
        );
      },
    )}

  </tbody>

</table>

    </div>

  )}

</article>

         </section>
)}


{activeWorkspace === "INVENTORY" && (

  <section className="dashboard-workspace">

    <div className="dashboard-workspace-header">

      <div>
        <h2>
          Inventory
        </h2>

        <p>
          View and manage current stock.
        </p>
      </div>


      <button
        type="button"
        className="dashboard-workspace-close"
        onClick={() =>
          setActiveWorkspace(
            "HOME",
          )
        }
      >
        Close
      </button>

    </div>


    <div className="dashboard-workspace-body dashboard-workspace-products">

     <Products
  key={inventoryRefreshKey}
  embedded
  onBackToDashboard={() =>
    setActiveWorkspace("HOME")
  }
  onLogout={onLogout}
/>

    </div>

  </section>

)}



{/* =====================================
    TRANSACTION HISTORY WORKSPACE
===================================== */}

{
  activeWorkspace ===
    "TRANSACTIONS" && (

    <section className="dashboard-workspace">

      <div className="dashboard-workspace-header">

        <div>

          <h2>
            Transaction History
          </h2>

          <p>
            Review sales, purchases,
            expenses, and inventory
            adjustments.
          </p>

        </div>


        <button
          type="button"
          className="dashboard-workspace-close"
          onClick={() =>
            setActiveWorkspace(
              "HOME",
            )
          }
        >
          Close
        </button>

      </div>


      <div
        className="dashboard-workspace-body"
      >

        <TransactionHistory
          embedded
          onBackToDashboard={() =>
            setActiveWorkspace(
              "HOME",
            )
          }
        />

      </div>

    </section>
  )
}


{
  activeWorkspace ===
    "FINANCIAL_REPORT" && (

    <section
      className="dashboard-workspace dashboard-financial-workspace"
    >

      <button
        type="button"
        className="dashboard-workspace-close"
        onClick={
          () =>
            setActiveWorkspace(
              "HOME",
            )
        }
        aria-label="Close Financial Report"
      >
        ×
      </button>


      <FinancialReport
        embedded
        onBackToDashboard={
          () =>
            setActiveWorkspace(
              "HOME",
            )
        }
      />

    </section>
  )
}


<AddProductModal
  isOpen={isAddProductModalOpen}
  product={null}
  onClose={() =>
    setIsAddProductModalOpen(false)
  }
  onProductCreated={async () => {

    setIsAddProductModalOpen(false);

    /*
     * Refresh dashboard cards:
     * Low Stock
     * Inventory Value
     * etc.
     */
    await loadDashboard();

    /*
     * If Inventory is currently open,
     * reload its Products component.
     */
    setInventoryRefreshKey(
      (currentKey) =>
        currentKey + 1,
    );
  }}
/>

<ReceiveStockModal
  isOpen={
    isReceiveStockModalOpen
  }
  onClose={() =>
    setIsReceiveStockModalOpen(
      false,
    )
  }
  onStockReceived={async () => {

    /*
     * Refresh dashboard:
     * - Low Stock
     * - Inventory Value
     * - Inventory Alerts
     */

    await loadDashboard();


    /*
     * Refresh embedded Inventory
     * if it is currently open.
     */

    setInventoryRefreshKey(
      (currentKey) =>
        currentKey + 1,
    );
  }}
/>


<ExpenseModal
  isOpen={
    isExpenseModalOpen
  }

  onClose={
    () =>
      setIsExpenseModalOpen(
        false,
      )
  }

  onExpenseCreated={
    async () => {
      await loadDashboard();
    }
  }
/>
      </main>

    </div>
  );
}


export default Dashboard;