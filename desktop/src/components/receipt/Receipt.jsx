import "./Receipt.css";


function formatMoney(cents) {
  const numericCents =
    Number(cents);

  if (
    !Number.isFinite(
      numericCents,
    )
  ) {
    return "Ksh 0.00";
  }

  return `Ksh ${(
    numericCents / 100
  ).toFixed(2)}`;
}


function formatReceiptDate(
  value,
) {
  const date =
    value
      ? new Date(value)
      : new Date();

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return {
      date: "",
      time: "",
    };
  }

  const dateText =
    new Intl.DateTimeFormat(
      "en-KE",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).format(
      date,
    );

  const timeText =
    new Intl.DateTimeFormat(
      "en-KE",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    ).format(
      date,
    );

  return {
    date: dateText,
    time: timeText,
  };
}


function getReceiptReference(
  sale,
) {
  return (
    sale.mpesaReference ??
    sale.mpesaReceiptNumber ??
    sale.transactionReference ??
    sale.referenceNumber ??
    ""
  );
}


function getCustomerPhone(
  sale,
) {
  return (
    sale.customerPhone ??
    sale.mpesaPhoneNumber ??
    sale.phoneNumber ??
    ""
  );
}


function Receipt({
  sale,
  paperWidth = "80mm",
}) {
  if (!sale) {
    return null;
  }

  const items =
    Array.isArray(
      sale.items,
    )
      ? sale.items
      : [];

  const {
    date,
    time,
  } =
    formatReceiptDate(
      sale.completedAt,
    );

  const paymentMethodLabel =
    sale.paymentMethod === "MPESA"
      ? "M-Pesa"
      : sale.paymentMethod === "SPLIT"
        ? "Split"
        : "Cash";

  const cashCents =
    Number(
      sale.cashCents ??
      0,
    );

  const mpesaCents =
    Number(
      sale.mpesaCents ??
      0,
    );

  const changeDueCents =
    Number(
      sale.changeDueCents ??
      0,
    );

  const amountPaidCents =
    Number(
      sale.totalPaidCents ??
      (
        cashCents +
        mpesaCents
      ),
    );

  const taxableCents =
    Math.max(
      Number(
        sale.subtotalCents ??
        0,
      ) -
      Number(
        sale.discountCents ??
        0,
      ),
      0,
    );

  const exemptCents =
    Number(
      sale.exemptCents ??
      0,
    );

  const itemCount =
    items.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.quantity ??
          0,
        ),
      0,
    );

  const customerPhone =
    getCustomerPhone(
      sale,
    );

  const receiptReference =
    getReceiptReference(
      sale,
    );


  return (
    <div
      className="thermal-receipt"
      style={{
        "--receipt-paper-width":
          paperWidth,
      }}
    >

      {/* =====================================
          STORE HEADER
      ===================================== */}

      <header className="receipt-store-header">

        <h1>
          KAMPI MART
        </h1>

        <p className="receipt-store-tagline">
          Commodities,School uniform, Stationaries, Tents & PA System
        </p>

        <div className="receipt-store-info">
         


          <span>
            Tel: 0738448863
          </span>

          
        </div>

      </header>


      <div className="receipt-solid-divider" />


      {/* =====================================
          RECEIPT META
      ===================================== */}

      <section className="receipt-sale-heading">

        <strong>
          CASH SALE
        </strong>

        <span>
          RECEIPT NO:{" "}
          {sale.saleNumber ??
            sale.receiptNumber ??
            "-"}
        </span>

      </section>


      <section className="receipt-meta-grid">

        <div>
          <span>
            Date
          </span>

          <strong>
            {date}
          </strong>
        </div>


        <div>
          <span>
            Time
          </span>

          <strong>
            {time}
          </strong>
        </div>


     


      

      </section>


      <section className="receipt-customer-block">

        <span>
          Customer Name
        </span>

        <div className="receipt-blank-line" />

      </section>


      <div className="receipt-dashed-divider" />


      {/* =====================================
          ITEMS TABLE
      ===================================== */}

      <section className="receipt-items-table">

        <div className="receipt-items-header">
          <span>
            ITEM
          </span>

          <span>
            QTY
          </span>

          <span>
            PRICE
          </span>

          <span>
            DISC
          </span>

          <span>
            AMT
          </span>
        </div>


        <div className="receipt-dashed-divider receipt-table-divider" />


        <div className="receipt-items-body">

          {items.map(
            (
              item,
              index,
            ) => {

              const quantity =
                Number(
                  item.quantity ??
                  0,
                );

              const unitPriceCents =
                Number(
                  item.unitPriceCents ??
                  item.selling_price_cents ??
                  0,
                );

              const lineTotalCents =
                Number(
                  item.lineTotalCents ??
                  (
                    unitPriceCents *
                    quantity
                  ),
                );

              const itemDiscountCents =
                Number(
                  item.discountCents ??
                  item.lineDiscountCents ??
                  0,
                );


              return (
                <div
                  className="receipt-item-row"
                  key={
                    item.id ??
                    item.productId ??
                    index
                  }
                >

                  <span
                    className="receipt-item-description"
                    title={
                      item.name ??
                      item.productName ??
                      "Product"
                    }
                  >
                    {item.name ??
                      item.productName ??
                      "Product"}
                  </span>


                  <span>
                    {quantity}
                  </span>


                  <span>
                    {(
                      unitPriceCents /
                      100
                    ).toFixed(2)}
                  </span>


                  <span>
                    {(
                      itemDiscountCents /
                      100
                    ).toFixed(2)}
                  </span>


                  <strong>
                    {(
                      lineTotalCents /
                      100
                    ).toFixed(2)}
                  </strong>

                </div>
              );
            },
          )}

        </div>

      </section>


      <div className="receipt-dashed-divider" />


      {/* =====================================
          TOTALS
      ===================================== */}

      <section className="receipt-totals">

        <div>
          <span>
            Taxable
          </span>

          <strong>
            {formatMoney(
              taxableCents,
            )}
          </strong>
        </div>


        <div>
          <span>
            Exempt
          </span>

          <strong>
            {formatMoney(
              exemptCents,
            )}
          </strong>
        </div>


        {Number(
          sale.discountCents ??
          0,
        ) > 0 && (
          <div>
            <span>
              Discount
            </span>

            <strong>
              -
              {formatMoney(
                sale.discountCents,
              )}
            </strong>
          </div>
        )}


        <div>
          <span>
            VAT
            {sale.vatRateBasisPoints != null
              ? ` (${sale.vatRateBasisPoints / 100}%)`
              : " (16%)"}
          </span>

          <strong>
            {formatMoney(
              sale.taxCents,
            )}
          </strong>
        </div>


        <div className="receipt-grand-total">

          <span>
            TOTAL
          </span>

          <strong>
            {formatMoney(
              sale.totalCents,
            )}
          </strong>

        </div>


        <div>
          <span>
            Items Count
          </span>

          <strong>
            {itemCount}
          </strong>
        </div>

      </section>


      <div className="receipt-dashed-divider" />


      {/* =====================================
          PAYMENT
      ===================================== */}

      <section className="receipt-payment-section">

        <h2>
          Payment
        </h2>


        <div className="receipt-payment-row">

          <span>
            Method
          </span>

          <strong>
            {paymentMethodLabel}
          </strong>

        </div>


        {cashCents > 0 && (

          <div className="receipt-payment-row">

            <span>
              Cash
            </span>

            <strong>
              {formatMoney(
                cashCents,
              )}
            </strong>

          </div>

        )}


        {mpesaCents > 0 && (

          <div className="receipt-payment-row">

            <span>
              M-Pesa
            </span>

            <strong>
              {formatMoney(
                mpesaCents,
              )}
            </strong>

          </div>

        )}


       


        <div className="receipt-payment-row">

          <span>
            Reference #
          </span>

          <strong>
            {receiptReference ||
              "________________"}
          </strong>

        </div>


        {customerPhone && (

          <div className="receipt-payment-row">

            <span>
              Phone
            </span>

            <strong>
              {customerPhone}
            </strong>

          </div>

        )}


        <div className="receipt-payment-box-row">

          <span>
            Paid Amount
          </span>

          <strong>
            {formatMoney(
              amountPaidCents,
            )}
          </strong>

        </div>


        <div className="receipt-payment-box-row">

          <span>
            Balance
          </span>

          <strong>
            {formatMoney(
              changeDueCents,
            )}
          </strong>

        </div>

      </section>


      <div className="receipt-dashed-divider" />


      {/* =====================================
          CUSTOMER NAME PLACEHOLDER
      ===================================== */}

      <section className="receipt-customer-payment-block">

        <span>
          Customer Name
        </span>

        <div className="receipt-blank-line" />

      </section>



     


      {/* =====================================
          FOOTER
      ===================================== */}

      <footer className="receipt-footer">

        <p className="receipt-return-note">
          Goods once sold are not
          returnable or refundable
        </p>


        <strong>
          Thank you for shopping
          with Kampi Mart
        </strong>


        <span>
          Served by:{" "}
          {sale.cashierName ??
            "Administrator"}
        </span>


        <small>
          Powered by HybridPOS
        </small>

      </footer>

    </div>
  );
}


export default Receipt;