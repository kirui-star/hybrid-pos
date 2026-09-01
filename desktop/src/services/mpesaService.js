/* ==========================================
   M-PESA FRONTEND SERVICE
========================================== */

function requireMpesaApi(
  methodName,
) {
  const method =
    window.api?.[methodName];

  if (
    typeof method !==
    "function"
  ) {
    throw new Error(
      `The M-Pesa API method "${methodName}" is unavailable.`,
    );
  }

  return method;
}


/* ==========================================
   PHONE NORMALIZATION
========================================== */

function normalizePhoneNumber(
  phoneNumber,
) {
  let phone =
    String(
      phoneNumber ?? "",
    )
      .trim()
      .replace(
        /\s+/g,
        "",
      )
      .replace(
        /-/g,
        "",
      )
      .replace(
        /\+/g,
        "",
      );


  if (
    phone.startsWith(
      "0",
    )
  ) {
    phone =
      `254${phone.slice(1)}`;
  }


  if (
    phone.startsWith(
      "7",
    ) ||
    phone.startsWith(
      "1",
    )
  ) {
    phone =
      `254${phone}`;
  }


  if (
    !/^254(7|1)\d{8}$/.test(
      phone,
    )
  ) {
    throw new Error(
      "Enter a valid Kenyan mobile number.",
    );
  }


  return phone;
}


/* ==========================================
   AMOUNT VALIDATION
========================================== */

function normalizeAmount(
  amount,
) {
  const numericAmount =
    Number(
      amount,
    );


  if (
    !Number.isFinite(
      numericAmount,
    ) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "M-Pesa amount must be greater than zero.",
    );
  }


  return numericAmount;
}


/* ==========================================
   SERVICE
========================================== */

export const mpesaService = {

  /* ========================================
     SEND STK PUSH
  ======================================== */

  async sendStkPush({
    phoneNumber,
    amount,
    accountReference,
    transactionDescription,
  }) {
    const sendMpesaStkPush =
      requireMpesaApi(
        "sendMpesaStkPush",
      );


    const normalizedPhone =
      normalizePhoneNumber(
        phoneNumber,
      );


    const normalizedAmount =
      normalizeAmount(
        amount,
      );


    return sendMpesaStkPush({
      phoneNumber:
        normalizedPhone,

      amount:
        normalizedAmount,

      accountReference:
        String(
          accountReference ??
            "HybridPOS",
        )
          .trim()
          .slice(
            0,
            12,
          ),

      transactionDescription:
        String(
          transactionDescription ??
            "HybridPOS Sale",
        )
          .trim()
          .slice(
            0,
            30,
          ),
    });
  },


  /* ========================================
     QUERY PAYMENT
  ======================================== */

  async queryPayment(
    checkoutRequestId,
  ) {
    const queryMpesaPayment =
      requireMpesaApi(
        "queryMpesaPayment",
      );


    const normalizedCheckoutRequestId =
      String(
        checkoutRequestId ??
          "",
      ).trim();


    if (
      !normalizedCheckoutRequestId
    ) {
      throw new Error(
        "CheckoutRequestID is required.",
      );
    }


    return queryMpesaPayment(
      normalizedCheckoutRequestId,
    );
  },


  /* ========================================
     HELPERS
  ======================================== */

  normalizePhoneNumber,

  normalizeAmount,
};