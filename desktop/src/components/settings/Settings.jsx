import ReceiptPreference from "./ReceiptPreference";
import "./Settings.css";


function Settings({
  onBackToDashboard,
}) {
  return (
    <div className="settings-page">

      <header className="settings-page-header">

        <div>
          <h1>
            Settings
          </h1>

          <p>
            Configure store and checkout preferences.
          </p>
        </div>

        <button
          type="button"
          className="settings-back-button"
          onClick={
            onBackToDashboard
          }
        >
          Back to Dashboard
        </button>

      </header>


      <main className="settings-page-content">

        <section className="settings-section">

          <div className="settings-section-heading">
            <h2>
              Receipts
            </h2>

            <p>
              Control what happens after a sale
              is completed.
            </p>
          </div>

          <ReceiptPreference />

        </section>

      </main>

    </div>
  );
}


export default Settings;