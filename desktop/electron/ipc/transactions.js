import {
  getTransactionHistory,
} from "../services/transactionHistoryService.js";


export function registerTransactionHandlers(
  ipcMain,
) {
  ipcMain.handle(
    "transactions:getHistory",
    (
      _event,
      filters = {},
    ) => {
      try {
        return getTransactionHistory(
          filters,
        );

      } catch (error) {
        console.error(
          "Unable to load transaction history:",
          error,
        );

        throw new Error(
          error?.message ||
          "Transaction history could not be loaded.",
        );
      }
    },
  );
}