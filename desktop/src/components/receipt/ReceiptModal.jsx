import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Receipt from "./Receipt";

import "./ReceiptModal.css";


function clampCustomWidth(value) {
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
      numericValue,
      40,
    ),
    120,
  );
}


function ReceiptModal({
  isOpen,
  sale,
  autoPrint = false,
  onClose,
  onNoReceipt,
  onPrinted,
}) {
  const [
    paperSize,
    setPaperSize,
  ] = useState("80");

  const [
    customWidth,
    setCustomWidth,
  ] = useState("72");

  const [
    isPrinting,
    setIsPrinting,
  ] = useState(false);

  const [
    hasAutoPrinted,
    setHasAutoPrinted,
  ] = useState(false);


  /* =========================================
     RESET WHEN RECEIPT OPENS
  ========================================= */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setIsPrinting(false);

    setHasAutoPrinted(
      false,
    );
  }, [
    isOpen,
    sale,
  ]);


  /* =========================================
     PAPER WIDTH
  ========================================= */

  const paperWidth =
    useMemo(() => {
      if (
        paperSize === "58"
      ) {
        return "58mm";
      }

      if (
        paperSize === "80"
      ) {
        return "80mm";
      }

      const width =
        clampCustomWidth(
          customWidth,
        );

      return `${width}mm`;
    }, [
      paperSize,
      customWidth,
    ]);


  /* =========================================
     CLOSE
  ========================================= */

  function handleClose() {
    if (isPrinting) {
      return;
    }

    onClose?.();
  }


  /* =========================================
     NO RECEIPT
  ========================================= */

  function handleNoReceipt() {
    if (isPrinting) {
      return;
    }

    if (
      typeof onNoReceipt ===
      "function"
    ) {
      onNoReceipt();

      return;
    }

    onClose?.();
  }


  /* =========================================
     PRINT
  ========================================= */

  async function handlePrint() {
    if (isPrinting) {
      return;
    }

    try {
      setIsPrinting(true);

      /*
       * For now this opens the
       * Electron/system print dialog.
       *
       * Later we can connect a selected
       * thermal printer through IPC.
       */
      window.print();

      onPrinted?.(
        sale,
      );

    } catch (error) {
      console.error(
        "Unable to print receipt:",
        error,
      );

      window.alert(
        error?.message ||
          "The receipt could not be printed.",
      );

    } finally {
      setIsPrinting(false);
    }
  }


  /* =========================================
     AUTO PRINT
  ========================================= */

  useEffect(() => {
    if (
      !isOpen ||
      !sale ||
      !autoPrint ||
      hasAutoPrinted
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setHasAutoPrinted(
            true,
          );

          handlePrint();
        },
        300,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    isOpen,
    sale,
    autoPrint,
    hasAutoPrinted,
  ]);


  /* =========================================
     BACKDROP
  ========================================= */

  function handleBackdropMouseDown(
    event,
  ) {
    if (
      event.target ===
      event.currentTarget
    ) {
      handleClose();
    }
  }


  if (
    !isOpen ||
    !sale
  ) {
    return null;
  }


  return (
    <div
      className="receipt-modal-backdrop"
      onMouseDown={
        handleBackdropMouseDown
      }
    >
      <section
        className="receipt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-modal-title"
      >

        {/* =====================================
            HEADER
        ===================================== */}

        <header className="receipt-modal-header">

          <div>
            <h2 id="receipt-modal-title">
              Receipt
            </h2>

            <p>
              Preview the receipt and choose
              the thermal paper width.
            </p>
          </div>


          <button
            type="button"
            className="receipt-modal-close"
            onClick={
              handleClose
            }
            disabled={
              isPrinting
            }
            aria-label="Close receipt"
          >
            ×
          </button>

        </header>


        {/* =====================================
            PAPER WIDTH
        ===================================== */}

        <div className="receipt-paper-settings">

          <span className="receipt-paper-label">
            Paper width
          </span>


          <div className="receipt-paper-options">

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
              disabled={
                isPrinting
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
              disabled={
                isPrinting
              }
            >
              80 mm
            </button>


            <button
              type="button"
              className={
                paperSize ===
                "CUSTOM"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPaperSize(
                  "CUSTOM",
                )
              }
              disabled={
                isPrinting
              }
            >
              Custom
            </button>

          </div>


          {paperSize ===
            "CUSTOM" && (

            <label className="receipt-custom-width">

              <span>
                Custom width
              </span>

              <div>
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
                  disabled={
                    isPrinting
                  }
                />

                <span>
                  mm
                </span>
              </div>

              <small>
                Recommended range:
                40–120 mm
              </small>

            </label>

          )}

        </div>


        {/* =====================================
            PREVIEW
        ===================================== */}

        <div className="receipt-preview-shell">

          <div className="receipt-preview-toolbar">

            <span>
              Preview
            </span>

            <strong>
              {paperWidth}
            </strong>

          </div>


          <div className="receipt-preview-scroll">

            <Receipt
              sale={sale}
              paperWidth={
                paperWidth
              }
            />

          </div>

        </div>


        {/* =====================================
            FOOTER
        ===================================== */}

        <footer className="receipt-modal-footer">

          <button
            type="button"
            className="receipt-no-receipt-button"
            onClick={
              handleNoReceipt
            }
            disabled={
              isPrinting
            }
          >
            No Receipt
          </button>


          <button
            type="button"
            className="receipt-close-button"
            onClick={
              handleClose
            }
            disabled={
              isPrinting
            }
          >
            Close
          </button>


          <button
            type="button"
            className="receipt-print-button"
            onClick={
              handlePrint
            }
            disabled={
              isPrinting
            }
          >
            {isPrinting
              ? "Printing..."
              : "Print Receipt"}
          </button>

        </footer>

      </section>
    </div>
  );
}


export default ReceiptModal;