import { ipcMain } from "electron";
import { fetchCloudProducts } from "../services/cloudProductService.js";
import { syncCloudProducts } from "../services/cloudSyncService.js";

export function registerCloudHandlers() {
  ipcMain.handle("cloud:get-products", async () => {
    try {
      const products = await fetchCloudProducts();

      return {
        success: true,
        products
      };
    } catch (error) {
      console.error("Cloud product fetch failed:", error);

      return {
        success: false,
        message: error.message
      };
    }
  });

  ipcMain.handle("cloud:sync-products", async () => {
  try {
    return await syncCloudProducts();
  } catch (error) {
    console.error("Cloud product sync failed:", error);

    return {
      success: false,
      message: error.message,
    };
  }
});
}