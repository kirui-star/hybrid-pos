/* ==========================================
   DASHBOARD FRONTEND SERVICE
========================================== */

function requireDashboardApi(
  methodName,
) {
  const method =
    window.api?.[methodName];

  if (
    typeof method !==
    "function"
  ) {
    throw new Error(
      `The dashboard API method "${methodName}" is unavailable.`,
    );
  }

  return method;
}


/* ==========================================
   DASHBOARD SERVICE
========================================== */

export const dashboardService = {

  /* ========================================
     GET ALL DASHBOARD DATA
  ======================================== */

  async getData() {
    const getDashboardData =
      requireDashboardApi(
        "getDashboardData",
      );

    return getDashboardData();
  },


  /* ========================================
     GET SUMMARY
  ======================================== */

  async getSummary() {
    const getDashboardSummary =
      requireDashboardApi(
        "getDashboardSummary",
      );

    return getDashboardSummary();
  },


  /* ========================================
     GET RECENT SALES
  ======================================== */

  async getRecentSales(
    limit = 5,
  ) {
    const getRecentSales =
      requireDashboardApi(
        "getRecentSales",
      );

    return getRecentSales(
      limit,
    );
  },


  /* ========================================
     GET INVENTORY ALERTS
  ======================================== */

  async getInventoryAlerts(
    limit = 5,
  ) {
    const getInventoryAlerts =
      requireDashboardApi(
        "getInventoryAlerts",
      );

    return getInventoryAlerts(
      limit,
    );
  },
};