import {
  useEffect,
  useState,
} from "react";

import {
  settingsService,
} from "../../services/settingsService";

import "./ReceiptPreference.css";


function ReceiptPreference() {
  const [
    receiptPreference,
    setReceiptPreference,
  ] = useState("ASK");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

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


  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const settings =
          await settingsService.get();

        setReceiptPreference(
          settings?.receipt_preference ??
          "ASK",
        );
      } catch (error) {
        console.error(
          "Unable to load receipt preference:",
          error,
        );

        setErrorMessage(
          error?.message ||
          "Receipt preference could not be loaded.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);


  async function handlePreferenceChange(
    nextPreference,
  ) {
    if (
      isSaving ||
      nextPreference ===
        receiptPreference
    ) {
      return;
    }

    const previousPreference =
      receiptPreference;

    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      /*
       * Update immediately for a faster UI.
       */
      setReceiptPreference(
        nextPreference,
      );

      const updatedSettings =
        await settingsService
          .updateReceiptPreference(
            nextPreference,
          );

      setReceiptPreference(
        updatedSettings
          ?.receipt_preference ??
        nextPreference,
      );

      setSuccessMessage(
        "Receipt preference saved.",
      );

      window.setTimeout(
        () => {
          setSuccessMessage("");
        },
        1800,
      );
    } catch (error) {
      console.error(
        "Unable to update receipt preference:",
        error,
      );

      /*
       * Restore previous value if saving fails.
       */
      setReceiptPreference(
        previousPreference,
      );

      setErrorMessage(
        error?.message ||
        "Receipt preference could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }


  return (
    <section className="receipt-preference-card">

      <div className="receipt-preference-header">
        <div>
          <h3>
            Receipt preference
          </h3>

          <p>
            Choose what HybridPOS should do
            after a successful sale.
          </p>
        </div>
      </div>


      {isLoading ? (
        <div className="receipt-preference-loading">
          Loading receipt preference...
        </div>
      ) : (
        <div className="receipt-preference-options">

          <button
            type="button"
            className={
              receiptPreference === "ASK"
                ? "receipt-preference-option active"
                : "receipt-preference-option"
            }
            onClick={() =>
              handlePreferenceChange(
                "ASK",
              )
            }
            disabled={isSaving}
          >
            <span className="receipt-radio">
              {receiptPreference === "ASK"
                ? "●"
                : "○"}
            </span>

            <span>
              <strong>
                Ask every sale
              </strong>

              <small>
                Choose Print Receipt or
                No Receipt after each sale.
              </small>
            </span>
          </button>


          <button
            type="button"
            className={
              receiptPreference === "ALWAYS"
                ? "receipt-preference-option active"
                : "receipt-preference-option"
            }
            onClick={() =>
              handlePreferenceChange(
                "ALWAYS",
              )
            }
            disabled={isSaving}
          >
            <span className="receipt-radio">
              {receiptPreference === "ALWAYS"
                ? "●"
                : "○"}
            </span>

            <span>
              <strong>
                Always print
              </strong>

              <small>
                Automatically print a receipt
                after every successful sale.
              </small>
            </span>
          </button>


          <button
            type="button"
            className={
              receiptPreference === "NEVER"
                ? "receipt-preference-option active"
                : "receipt-preference-option"
            }
            onClick={() =>
              handlePreferenceChange(
                "NEVER",
              )
            }
            disabled={isSaving}
          >
            <span className="receipt-radio">
              {receiptPreference === "NEVER"
                ? "●"
                : "○"}
            </span>

            <span>
              <strong>
                Never print
              </strong>

              <small>
                Complete the sale without
                showing a receipt prompt.
              </small>
            </span>
          </button>

        </div>
      )}


      {successMessage && (
        <div className="receipt-preference-success">
          {successMessage}
        </div>
      )}


      {errorMessage && (
        <div className="receipt-preference-error">
          {errorMessage}
        </div>
      )}

    </section>
  );
}


export default ReceiptPreference;