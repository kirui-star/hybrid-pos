const {
  contextBridge,
  ipcRenderer,
} = require("electron");


contextBridge.exposeInMainWorld(
  "api",
  {

    /* =========================================
       PRODUCTS
    ========================================= */

    getProducts: () =>
      ipcRenderer.invoke(
        "products:getAll",
      ),

    getProductByBarcode: (
      barcode,
    ) =>
      ipcRenderer.invoke(
        "products:getByBarcode",
        barcode,
      ),

    createProduct: (
      product,
    ) =>
      ipcRenderer.invoke(
        "products:create",
        product,
      ),

    updateProduct: (
      productId,
      product,
    ) =>
      ipcRenderer.invoke(
        "products:update",
        productId,
        product,
      ),

    deactivateProduct: (
      productId,
    ) =>
      ipcRenderer.invoke(
        "products:deactivate",
        productId,
      ),

    activateProduct: (
      productId,
    ) =>
      ipcRenderer.invoke(
        "products:activate",
        productId,
      ),

    deleteProduct: (
      productId,
    ) =>
      ipcRenderer.invoke(
        "products:delete",
        productId,
      ),


    /* =========================================
       INVENTORY
    ========================================= */

    adjustInventory: (
      adjustment,
    ) =>
      ipcRenderer.invoke(
        "inventory:adjust",
        adjustment,
      ),


    /* =========================================
       SALES
    ========================================= */

    completeSale: (
      sale,
    ) =>
      ipcRenderer.invoke(
        "sales:complete",
        sale,
      ),

    getSaleReceipt: (
      saleId,
    ) =>
      ipcRenderer.invoke(
        "sales:getReceipt",
        saleId,
      ),

    holdSale: (
      payload,
    ) =>
      ipcRenderer.invoke(
        "sales:hold",
        payload,
      ),

    getHeldSales: () =>
      ipcRenderer.invoke(
        "sales:getHeld",
      ),

    getHeldSaleById: (
      heldSaleId,
    ) =>
      ipcRenderer.invoke(
        "sales:getHeldById",
        heldSaleId,
      ),

    closeHeldSale: (
      heldSaleId,
      status = "COMPLETED",
    ) =>
      ipcRenderer.invoke(
        "sales:closeHeld",
        heldSaleId,
        status,
      ),


    /* =========================================
       EXPENSES
    ========================================= */

    createExpense: (
      expense,
    ) =>
      ipcRenderer.invoke(
        "expenses:create",
        expense,
      ),

    getExpenses: (
      limit = 200,
    ) =>
      ipcRenderer.invoke(
        "expenses:getAll",
        limit,
      ),

    getTodayExpenses: () =>
      ipcRenderer.invoke(
        "expenses:getToday",
      ),

    getExpensesByDateRange: (
      startDate,
      endDate,
    ) =>
      ipcRenderer.invoke(
        "expenses:getByDateRange",
        {
          startDate,
          endDate,
        },
      ),

    getExpenseSummary: (
      filters = {},
    ) =>
      ipcRenderer.invoke(
        "expenses:getSummary",
        filters,
      ),

    getTodayExpenseSummary: () =>
      ipcRenderer.invoke(
        "expenses:getTodaySummary",
      ),

    voidExpense: (
      expenseId,
    ) =>
      ipcRenderer.invoke(
        "expenses:void",
        expenseId,
      ),


    /* =========================================
       PURCHASES / RECEIVE STOCK
    ========================================= */

    receiveStockPurchase: (
      purchase,
    ) =>
      ipcRenderer.invoke(
        "purchases:receiveStock",
        purchase,
      ),

    getPurchases: (
      limit = 200,
    ) =>
      ipcRenderer.invoke(
        "purchases:getAll",
        limit,
      ),

    getTodayPurchaseSummary: () =>
      ipcRenderer.invoke(
        "purchases:getTodaySummary",
      ),

    createNewProductAndReceiveStock: (
      payload,
    ) =>
      ipcRenderer.invoke(
        "purchases:createNewProductAndReceiveStock",
        payload,
      ),


    /* =========================================
       M-PESA
    ========================================= */

    sendMpesaStkPush: (
      payload,
    ) =>
      ipcRenderer.invoke(
        "mpesa:stkPush",
        payload,
      ),

    queryMpesaPayment: (
      checkoutRequestId,
    ) =>
      ipcRenderer.invoke(
        "mpesa:query",
        checkoutRequestId,
      ),


    /* =========================================
       SETTINGS
    ========================================= */

    getSettings: () =>
      ipcRenderer.invoke(
        "settings:get",
      ),

    updateReceiptPreference: (
      receiptPreference,
    ) =>
      ipcRenderer.invoke(
        "settings:updateReceiptPreference",
        receiptPreference,
      ),

    updateReceiptPaperWidth: (
      receiptPaperWidthMm,
    ) =>
      ipcRenderer.invoke(
        "settings:updateReceiptPaperWidth",
        receiptPaperWidthMm,
      ),

    updateReceiptPrinter: (
      receiptPrinterName,
    ) =>
      ipcRenderer.invoke(
        "settings:updateReceiptPrinter",
        receiptPrinterName,
      ),

    updateReceiptPrinterSettings: (
      settings,
    ) =>
      ipcRenderer.invoke(
        "settings:updateReceiptPrinterSettings",
        settings,
      ),

    updateVatRate: (
      vatRateBasisPoints,
    ) =>
      ipcRenderer.invoke(
        "settings:updateVatRate",
        vatRateBasisPoints,
      ),


    /* =========================================
       DASHBOARD
    ========================================= */

    getDashboardData: () =>
      ipcRenderer.invoke(
        "dashboard:getData",
      ),

    getDashboardSummary: () =>
      ipcRenderer.invoke(
        "dashboard:getSummary",
      ),

    getRecentSales: (
      limit = 5,
    ) =>
      ipcRenderer.invoke(
        "dashboard:getRecentSales",
        limit,
      ),

    getInventoryAlerts: (
      limit = 5,
    ) =>
      ipcRenderer.invoke(
        "dashboard:getInventoryAlerts",
        limit,
      ),


    /* =========================================
       CATEGORIES
    ========================================= */

    getCategories: () =>
      ipcRenderer.invoke(
        "categories:getAll",
      ),


    /* =========================================
       FINANCIAL REPORT
    ========================================= */

    getFinancialReport: (
      filters = {},
    ) =>
      ipcRenderer.invoke(
        "reports:getFinancialReport",
        filters,
      ),


    /* =========================================
       TRANSACTION HISTORY
    ========================================= */

    getTransactionHistory: (
      filters = {},
    ) =>
      ipcRenderer.invoke(
        "transactions:getHistory",
        filters,
      ),
  },
);