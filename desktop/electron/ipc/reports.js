import {
  getFinancialReport,
} from "../services/financialReportService.js";


export function registerReportHandlers(
  ipcMain,
) {
  ipcMain.handle(
    "reports:getFinancialReport",
    (
      _event,
      filters = {},
    ) => {
      try {
        return getFinancialReport(
          filters,
        );

      } catch (error) {
        console.error(
          "Unable to generate financial report:",
          error,
        );

        throw new Error(
          error?.message ||
            "Financial report could not be generated.",
        );
      }
    },
  );
}