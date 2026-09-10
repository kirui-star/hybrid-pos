import {
  app,
  BrowserWindow,
  ipcMain,
} from "electron";

import path from "node:path";

import {
  fileURLToPath,
} from "node:url";

import {
  registerProductHandlers,
} from "./ipc/products.js";

import {
  registerCategoryHandlers,
} from "./ipc/categories.js";

import {
  registerSaleHandlers,
} from "./ipc/sales.js";

import {
  registerExpenseHandlers,
} from "./ipc/expenses.js";

import {
  initializeDatabase,
  closeDatabase,
} from "./database/database.js";

import {
  registerSettingsHandlers,
} from "./ipc/settings.js";

import {
  registerMpesaHandlers,
} from "./ipc/mpesa.js";

import {
  registerDashboardHandlers,
} from "./ipc/dashboard.js";

import {
  registerPurchaseHandlers,
} from "./ipc/purchases.js";

import {
  registerTransactionHandlers,
} from "./ipc/transactions.js";

import {
  registerReportHandlers,
} from "./ipc/reports.js";
import { registerCloudHandlers } from "./ipc/cloud.js";


import {
  syncCloudProducts,
} from "./services/cloudSyncService.js";

let productSyncInterval = null;
let productSyncInProgress = false;

const PRODUCT_SYNC_INTERVAL_MS = 60 * 1000;

const currentFilePath =
  fileURLToPath(
    import.meta.url,
  );

const currentDirectory =
  path.dirname(
    currentFilePath,
  );

let mainWindow = null;


/* ==========================================
   CREATE MAIN WINDOW
========================================== */

function createMainWindow() {
  mainWindow =
    new BrowserWindow({
      width: 1440,
      height: 900,

      minWidth: 1100,
      minHeight: 700,

      show: false,

      webPreferences: {
        preload:
          path.join(
            currentDirectory,
            "preload.cjs",
          ),

        contextIsolation: true,
        nodeIntegration: false,
      },
    });


  if (app.isPackaged) {
    const indexPath =
      path.join(
        currentDirectory,
        "../dist/index.html",
      );

    console.log(
      `Loading packaged app: ${indexPath}`,
    );

    mainWindow.loadFile(
      indexPath,
    );

  } else {
    mainWindow.loadURL(
      "http://localhost:5173",
    );
  }


  mainWindow.once(
    "ready-to-show",
    () => {
      mainWindow.show();
    },
  );


  mainWindow.webContents.on(
    "did-fail-load",
    (
      _event,
      errorCode,
      errorDescription,
    ) => {
      console.error(
        "Renderer failed to load:",
        errorCode,
        errorDescription,
      );
    },
  );


  mainWindow.on(
    "closed",
    () => {
      mainWindow = null;
    },
  );
}


async function runBackgroundProductSync() {
  if (productSyncInProgress) {
    console.log(
      "Background product sync skipped: previous sync still running.",
    );

    return;
  }

  try {
    productSyncInProgress = true;

    const result = await syncCloudProducts();

    console.log(
      "Background product sync completed:",
      result,
    );
  } catch (error) {
    console.warn(
      "Background product sync unavailable:",
      error.message,
    );
  } finally {
    productSyncInProgress = false;
  }
}

/* ==========================================
   APP READY
========================================== */

app.whenReady().then(() => {
  try {
    initializeDatabase();

    syncCloudProducts()
      .then((result) => {
        console.log(
          "Startup product sync completed:",
          result,
        );
      })
      .catch((error) => {
        console.warn(
          "Startup product sync unavailable:",
          error.message,
        );
      });


      productSyncInterval = setInterval(
  runBackgroundProductSync,
  PRODUCT_SYNC_INTERVAL_MS,
);
   


    registerProductHandlers(
      ipcMain,
    );


    registerCategoryHandlers(
      ipcMain,
    );


    registerSaleHandlers(
      ipcMain,
    );


    registerExpenseHandlers(
      ipcMain,
    );


    registerSettingsHandlers(
      ipcMain,
    );


    registerMpesaHandlers(
      ipcMain,
    );


    registerDashboardHandlers(
      ipcMain,
    );


    registerReportHandlers(
      ipcMain,
    );


    registerPurchaseHandlers(
      ipcMain,
    );


    registerTransactionHandlers(
      ipcMain,
    );

  registerCloudHandlers(
  ipcMain,
);


    createMainWindow();

  } catch (error) {
    console.error(
      "Failed to start HybridPOS:",
      error,
    );

    app.quit();
  }


  app.on(
    "activate",
    () => {
      if (
        BrowserWindow
          .getAllWindows()
          .length === 0
      ) {
        createMainWindow();
      }
    },
  );
});

if (productSyncInterval) {
  clearInterval(productSyncInterval);
  productSyncInterval = null;
}

/* ==========================================
   BEFORE QUIT
========================================== */

app.on(
  "before-quit",
  () => {
    closeDatabase();
  },
);


/* ==========================================
   ALL WINDOWS CLOSED
========================================== */

app.on(
  "window-all-closed",
  () => {
    if (
      process.platform !==
      "darwin"
    ) {
      app.quit();
    }
  },
);