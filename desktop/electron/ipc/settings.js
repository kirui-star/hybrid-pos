import {
  getDatabase,
} from "../database/database.js";


const STORE_ID =
  "store-001";


/* =========================================
   HELPERS
========================================= */

function getStoreSettings(
  database,
) {
  database
    .prepare(`
      INSERT OR IGNORE INTO store_settings (
        store_id,
        vat_rate_basis_points,
        receipt_preference,
        receipt_paper_width_mm,
        receipt_printer_name
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(
      STORE_ID,
      1600,
      "ASK",
      80,
      null,
    );


  return database
    .prepare(`
      SELECT
        store_id,
        vat_rate_basis_points,
        receipt_preference,
        receipt_paper_width_mm,
        receipt_printer_name,
        updated_at

      FROM store_settings

      WHERE store_id = ?

      LIMIT 1
    `)
    .get(
      STORE_ID,
    );
}


/* =========================================
   REGISTER SETTINGS HANDLERS
========================================= */

export function registerSettingsHandlers(
  ipcMain,
) {

  /* =====================================
     GET SETTINGS
  ===================================== */

  ipcMain.handle(
    "settings:get",
    () => {
      const database =
        getDatabase();

      return getStoreSettings(
        database,
      );
    },
  );


  /* =====================================
     UPDATE RECEIPT PREFERENCE
  ===================================== */

  ipcMain.handle(
    "settings:updateReceiptPreference",
    (
      _event,
      receiptPreference,
    ) => {
      const allowedPreferences = [
        "ASK",
        "ALWAYS",
        "NEVER",
      ];


      if (
        !allowedPreferences.includes(
          receiptPreference,
        )
      ) {
        throw new Error(
          "Invalid receipt preference.",
        );
      }


      const database =
        getDatabase();


      getStoreSettings(
        database,
      );


      database
        .prepare(`
          UPDATE store_settings

          SET
            receipt_preference = ?,
            updated_at =
              CURRENT_TIMESTAMP

          WHERE store_id = ?
        `)
        .run(
          receiptPreference,
          STORE_ID,
        );


      return getStoreSettings(
        database,
      );
    },
  );


  /* =====================================
     UPDATE RECEIPT PAPER WIDTH
  ===================================== */

  ipcMain.handle(
    "settings:updateReceiptPaperWidth",
    (
      _event,
      receiptPaperWidthMm,
    ) => {
      const numericWidth =
        Number(
          receiptPaperWidthMm,
        );


      if (
        !Number.isInteger(
          numericWidth,
        ) ||
        numericWidth < 40 ||
        numericWidth > 120
      ) {
        throw new Error(
          "Receipt paper width must be between 40 mm and 120 mm.",
        );
      }


      const database =
        getDatabase();


      getStoreSettings(
        database,
      );


      database
        .prepare(`
          UPDATE store_settings

          SET
            receipt_paper_width_mm = ?,
            updated_at =
              CURRENT_TIMESTAMP

          WHERE store_id = ?
        `)
        .run(
          numericWidth,
          STORE_ID,
        );


      return getStoreSettings(
        database,
      );
    },
  );


  /* =====================================
     UPDATE RECEIPT PRINTER
  ===================================== */

  ipcMain.handle(
    "settings:updateReceiptPrinter",
    (
      _event,
      printerName,
    ) => {
      const normalizedPrinterName =
        String(
          printerName ?? "",
        ).trim();


      const database =
        getDatabase();


      getStoreSettings(
        database,
      );


      database
        .prepare(`
          UPDATE store_settings

          SET
            receipt_printer_name = ?,
            updated_at =
              CURRENT_TIMESTAMP

          WHERE store_id = ?
        `)
        .run(
          normalizedPrinterName ||
            null,
          STORE_ID,
        );


      return getStoreSettings(
        database,
      );
    },
  );


  /* =====================================
     UPDATE PRINTER SETTINGS TOGETHER
  ===================================== */

  ipcMain.handle(
    "settings:updateReceiptPrinterSettings",
    (
      _event,
      settings,
    ) => {
      const numericWidth =
        Number(
          settings
            ?.receiptPaperWidthMm,
        );


      if (
        !Number.isInteger(
          numericWidth,
        ) ||
        numericWidth < 40 ||
        numericWidth > 120
      ) {
        throw new Error(
          "Receipt paper width must be between 40 mm and 120 mm.",
        );
      }


      const printerName =
        String(
          settings
            ?.receiptPrinterName ??
            "",
        ).trim();


      const database =
        getDatabase();


      getStoreSettings(
        database,
      );


      database
        .prepare(`
          UPDATE store_settings

          SET
            receipt_paper_width_mm = ?,
            receipt_printer_name = ?,
            updated_at =
              CURRENT_TIMESTAMP

          WHERE store_id = ?
        `)
        .run(
          numericWidth,

          printerName ||
            null,

          STORE_ID,
        );


      return getStoreSettings(
        database,
      );
    },
  );


  /* =====================================
     UPDATE VAT RATE
  ===================================== */

  ipcMain.handle(
    "settings:updateVatRate",
    (
      _event,
      vatRateBasisPoints,
    ) => {
      const numericRate =
        Number(
          vatRateBasisPoints,
        );


      if (
        !Number.isInteger(
          numericRate,
        ) ||
        numericRate < 0 ||
        numericRate > 10000
      ) {
        throw new Error(
          "VAT rate must be between 0% and 100%.",
        );
      }


      const database =
        getDatabase();


      getStoreSettings(
        database,
      );


      database
        .prepare(`
          UPDATE store_settings

          SET
            vat_rate_basis_points = ?,
            updated_at =
              CURRENT_TIMESTAMP

          WHERE store_id = ?
        `)
        .run(
          numericRate,
          STORE_ID,
        );


      return getStoreSettings(
        database,
      );
    },
  );
}