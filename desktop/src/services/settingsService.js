function requireSettingsApi(
  methodName,
) {
  const method =
    window.api?.[methodName];

  if (
    typeof method !==
    "function"
  ) {
    throw new Error(
      `The settings API method "${methodName}" is unavailable.`,
    );
  }

  return method;
}


export const settingsService = {

  /* =========================================
     GET SETTINGS
  ========================================= */

  async get() {
    const getSettings =
      requireSettingsApi(
        "getSettings",
      );

    return getSettings();
  },


  /* =========================================
     RECEIPT PREFERENCE
  ========================================= */

  async updateReceiptPreference(
    receiptPreference,
  ) {
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

    const updateReceiptPreference =
      requireSettingsApi(
        "updateReceiptPreference",
      );

    return updateReceiptPreference(
      receiptPreference,
    );
  },


  /* =========================================
     PAPER WIDTH
  ========================================= */

  async updateReceiptPaperWidth(
    receiptPaperWidthMm,
  ) {
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

    const updateReceiptPaperWidth =
      requireSettingsApi(
        "updateReceiptPaperWidth",
      );

    return updateReceiptPaperWidth(
      numericWidth,
    );
  },


  /* =========================================
     PRINTER
  ========================================= */

  async updateReceiptPrinter(
    receiptPrinterName,
  ) {
    const updateReceiptPrinter =
      requireSettingsApi(
        "updateReceiptPrinter",
      );

    return updateReceiptPrinter(
      String(
        receiptPrinterName ??
        "",
      ).trim(),
    );
  },


  /* =========================================
     PRINTER + PAPER WIDTH
  ========================================= */

  async updateReceiptPrinterSettings(
    {
      receiptPrinterName,
      receiptPaperWidthMm,
    },
  ) {
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

    const updatePrinterSettings =
      requireSettingsApi(
        "updateReceiptPrinterSettings",
      );

    return updatePrinterSettings({
      receiptPrinterName:
        String(
          receiptPrinterName ??
          "",
        ).trim(),

      receiptPaperWidthMm:
        numericWidth,
    });
  },


  /* =========================================
     VAT
  ========================================= */

  async updateVatRate(
    vatRateBasisPoints,
  ) {
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

    const updateVatRate =
      requireSettingsApi(
        "updateVatRate",
      );

    return updateVatRate(
      numericRate,
    );
  },
};