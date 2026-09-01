import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  settingsService,
} from "../../services/settingsService";

import "./ReceiptPrinterSettingsModal.css";


function clampWidth(value) {
  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return 80;
  }

  return Math.min(
    Math.max(
      Math.round(
        numericValue,
      ),
      40,
    ),
    120,
  );
}


function ReceiptPrinterSettingsModal({
  isOpen,
  onClose,
}) {
  const [
    receiptPreference,
    setReceiptPreference,
  ] = useState("ASK");

  const [
    printerName,
    setPrinterName,
  ] = useState("");

  const [
    paperSize,
    setPaperSize,
  ] = useState("80");

  const [
    customWidth,
    setCustomWidth,
  ] = useState("72");

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");


  const receiptPaperWidthMm =
    useMemo(() => {
      if (
        paperSize === "58"
      ) {
        return 58;
      }

      if (
        paperSize === "80"
      ) {
        return 80;
      }

      return clampWidth(
        customWidth,
      );
    }, [
      paperSize,
      customWidth,
    ]);


  useEffect(() => {
    if (!isOpen) {
      return;
    }

    async function loadSettings() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        const settings =
          await settingsService.get();

        const savedPreference =
          settings
            ?.receipt_preference ??
          "ASK";

        const savedPrinterName =
          settings
            ?.receipt_printer_name ??
          "";

        const savedWidth =
          Number(
            settings
              ?.receipt_paper_width_mm ??
            80,
          );


        setReceiptPreference(
          savedPreference,
        );

        setPrinterName(
          savedPrinterName,
        );


        if (
          savedWidth === 58
        ) {
          setPaperSize(
            "58",
          );

        } else if (
          savedWidth === 80
        ) {
          setPaperSize(
            "80",
          );

        } else {
          setPaperSize(
            "CUSTOM",
          );

          setCustomWidth(
            String(
              savedWidth,
            ),
          );
        }

      } catch (error) {
        console.error(
          "Unable to load printer settings:",
          error,
        );

        setErrorMessage(
          error?.message ||
          "Printer settings could not be loaded.",
        );

      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();

  }, [
    isOpen,
  ]);


  if (!isOpen) {
    return null;
  }


  function handleBackdropMouseDown(
    event,
  ) {
    if (
      event.target ===
      event.currentTarget &&
      !isSaving
    ) {
      onClose?.();
    }
  }


  async function handleSave() {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      await settingsService
        .updateReceiptPreference(
          receiptPreference,
        );

      await settingsService
        .updateReceiptPrinterSettings({
          receiptPrinterName:
            printerName,

          receiptPaperWidthMm:
            receiptPaperWidthMm,
        });

      setSuccessMessage(
        "Receipt and printer settings saved.",
      );

      window.setTimeout(
        () => {
          onClose?.();
        },
        700,
      );

    } catch (error) {
      console.error(
        "Unable to save printer settings:",
        error,
      );

      setErrorMessage(
        error?.message ||
        "Printer settings could not be saved.",
      );

    } finally {
      setIsSaving(false);
    }
  }


  function handleTestPrint() {
    /*
     * For now this opens the regular
     * print dialog.
     *
     * Once we add Electron silent
     * printing, this button will print
     * directly to the saved printer.
     */

    window.print();
  }


  return (
    <div
      className="receipt-printer-settings-backdrop"
      onMouseDown={
        handleBackdropMouseDown
      }
    >
      <section
        className="receipt-printer-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-printer-settings-title"
        onMouseDown={(
          event,
        ) =>
          event.stopPropagation()
        }
      >

        {/* =====================================
            HEADER
        ===================================== */}

        <header className="receipt-printer-settings-header">

          <div>
            <h2 id="receipt-printer-settings-title">
              Receipt & Printer Settings
            </h2>

            <p>
              Configure receipt behavior,
              printer and thermal paper width.
            </p>
          </div>


          <button
            type="button"
            className="receipt-printer-settings-close"
            onClick={
              onClose
            }
            disabled={
              isSaving
            }
            aria-label="Close printer settings"
          >
            ×
          </button>

        </header>


        {isLoading ? (

          <div className="receipt-printer-settings-loading">
            Loading printer settings...
          </div>

        ) : (

          <div className="receipt-printer-settings-body">

            {/* =================================
                RECEIPT PREFERENCE
            ================================= */}

            <section className="printer-settings-section">

              <div className="printer-settings-section-heading">
                <h3>
                  Receipt preference
                </h3>

                <p>
                  Choose what happens after
                  a sale is completed.
                </p>
              </div>


              <div className="printer-settings-choice-group">

                <button
                  type="button"
                  className={
                    receiptPreference === "ASK"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setReceiptPreference(
                      "ASK",
                    )
                  }
                >
                  <strong>
                    Ask every sale
                  </strong>

                  <small>
                    Show Print Receipt or
                    No Receipt.
                  </small>
                </button>


                <button
                  type="button"
                  className={
                    receiptPreference === "ALWAYS"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setReceiptPreference(
                      "ALWAYS",
                    )
                  }
                >
                  <strong>
                    Always print
                  </strong>

                  <small>
                    Print after every
                    successful sale.
                  </small>
                </button>


                <button
                  type="button"
                  className={
                    receiptPreference === "NEVER"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setReceiptPreference(
                      "NEVER",
                    )
                  }
                >
                  <strong>
                    Never print
                  </strong>

                  <small>
                    Complete sales without
                    printing.
                  </small>
                </button>

              </div>

            </section>


            {/* =================================
                PRINTER
            ================================= */}

            <section className="printer-settings-section">

              <div className="printer-settings-section-heading">
                <h3>
                  Thermal printer
                </h3>

                <p>
                  Enter or select the printer
                  used for receipts.
                </p>
              </div>


              <label className="printer-settings-field">

                <span>
                  Printer name
                </span>

                <input
                  type="text"
                  value={
                    printerName
                  }
                  onChange={(
                    event,
                  ) =>
                    setPrinterName(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Example: EPSON TM-T20III"
                />

              </label>


              {!printerName && (
                <small className="printer-settings-hint">
                  No printer selected yet.
                  Silent printing will require
                  a saved printer.
                </small>
              )}

            </section>


            {/* =================================
                PAPER WIDTH
            ================================= */}

            <section className="printer-settings-section">

              <div className="printer-settings-section-heading">
                <h3>
                  Paper width
                </h3>

                <p>
                  Match this to the thermal
                  paper loaded in the printer.
                </p>
              </div>


              <div className="printer-paper-options">

                <button
                  type="button"
                  className={
                    paperSize === "58"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPaperSize(
                      "58",
                    )
                  }
                >
                  58 mm
                </button>


                <button
                  type="button"
                  className={
                    paperSize === "80"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPaperSize(
                      "80",
                    )
                  }
                >
                  80 mm
                </button>


                <button
                  type="button"
                  className={
                    paperSize === "CUSTOM"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPaperSize(
                      "CUSTOM",
                    )
                  }
                >
                  Custom
                </button>

              </div>


              {paperSize ===
                "CUSTOM" && (

                <label className="printer-settings-field printer-custom-width-field">

                  <span>
                    Custom width
                  </span>

                  <div className="printer-custom-width-input">

                    <input
                      type="number"
                      min="40"
                      max="120"
                      step="1"
                      value={
                        customWidth
                      }
                      onChange={(
                        event,
                      ) =>
                        setCustomWidth(
                          event.target
                            .value,
                        )
                      }
                    />

                    <span>
                      mm
                    </span>

                  </div>

                  <small>
                    Allowed range:
                    40–120 mm
                  </small>

                </label>

              )}


              <div className="printer-paper-summary">
                Saved width will be{" "}
                <strong>
                  {receiptPaperWidthMm}
                  {" "}mm
                </strong>
              </div>

            </section>


            {/* =================================
                MESSAGES
            ================================= */}

            {errorMessage && (
              <div className="printer-settings-error">
                {errorMessage}
              </div>
            )}


            {successMessage && (
              <div className="printer-settings-success">
                {successMessage}
              </div>
            )}

          </div>

        )}


        {/* =====================================
            FOOTER
        ===================================== */}

        <footer className="receipt-printer-settings-footer">

          <button
            type="button"
            className="printer-settings-test-button"
            onClick={
              handleTestPrint
            }
            disabled={
              isLoading ||
              isSaving
            }
          >
            Test Print
          </button>


          <div className="printer-settings-footer-actions">

            <button
              type="button"
              className="printer-settings-cancel-button"
              onClick={
                onClose
              }
              disabled={
                isSaving
              }
            >
              Cancel
            </button>


            <button
              type="button"
              className="printer-settings-save-button"
              onClick={
                handleSave
              }
              disabled={
                isLoading ||
                isSaving
              }
            >
              {isSaving
                ? "Saving..."
                : "Save Settings"}
            </button>

          </div>

        </footer>

      </section>
    </div>
  );
}


export default ReceiptPrinterSettingsModal;