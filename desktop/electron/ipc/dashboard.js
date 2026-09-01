import {
  getDashboardData,
  getDashboardSummary,
  getRecentSales,
  getInventoryAlerts,
} from "../services/dashboardService.js";


/* ==========================================
   REGISTER DASHBOARD HANDLERS
========================================== */

export function registerDashboardHandlers(
  ipcMain,
) {

  /* ========================================
     GET ALL DASHBOARD DATA
  ======================================== */

  ipcMain.handle(
    "dashboard:getData",
    () => {
      return getDashboardData();
    },
  );


  /* ========================================
     GET SUMMARY ONLY
  ======================================== */

  ipcMain.handle(
    "dashboard:getSummary",
    () => {
      return getDashboardSummary();
    },
  );


  /* ========================================
     GET RECENT SALES
  ======================================== */

  ipcMain.handle(
    "dashboard:getRecentSales",
    (
      _event,
      limit = 5,
    ) => {
      return getRecentSales(
        limit,
      );
    },
  );


  /* ========================================
     GET INVENTORY ALERTS
  ======================================== */

  ipcMain.handle(
    "dashboard:getInventoryAlerts",
    (
      _event,
      limit = 5,
    ) => {
      return getInventoryAlerts(
        limit,
      );
    },
  );
}