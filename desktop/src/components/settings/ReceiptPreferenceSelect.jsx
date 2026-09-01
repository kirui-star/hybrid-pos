import {
  useEffect,
  useState,
} from "react";

import {
  settingsService,
} from "../../services/settingsService";


function ReceiptPreferenceSelect() {
  const [
    preference,
    setPreference,
  ] = useState("ASK");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);


  useEffect(() => {
    async function loadPreference() {
      try {
        const settings =
          await settingsService.get();

        setPreference(
          settings?.receipt_preference ??
            "ASK",
        );
      } catch (error) {
        console.error(
          "Failed to load receipt preference:",
          error,
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadPreference();
  }, []);


  async function handleChange(event) {
    const nextPreference =
      event.target.value;

    const previousPreference =
      preference;

    try {
      setPreference(
        nextPreference,
      );

      setIsSaving(true);

      const settings =
        await settingsService
          .updateReceiptPreference(
            nextPreference,
          );

      setPreference(
        settings?.receipt_preference ??
          nextPreference,
      );
    } catch (error) {
      setPreference(
        previousPreference,
      );

      console.error(
        "Failed to save receipt preference:",
        error,
      );
    } finally {
      setIsSaving(false);
    }
  }


  return (
    <div className="pos-receipt-preference">

      <span className="pos-receipt-icon">
        🧾
      </span>

      <label
        htmlFor="receipt-preference"
      >
        Receipt
      </label>

      <select
        id="receipt-preference"
        value={preference}
        onChange={handleChange}
        disabled={
          isLoading ||
          isSaving
        }
      >
        <option value="ASK">
          Ask every sale
        </option>

        <option value="ALWAYS">
          Always print
        </option>

        <option value="NEVER">
          Never print
        </option>
      </select>

    </div>
  );
}


export default ReceiptPreferenceSelect;