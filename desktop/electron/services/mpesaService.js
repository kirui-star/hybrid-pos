import "dotenv/config";


/* ==========================================
   M-PESA CONFIG
========================================== */

const MPESA_ENVIRONMENT =
  String(
    process.env.MPESA_ENVIRONMENT ??
      "sandbox",
  )
    .trim()
    .toLowerCase();


const MPESA_CONSUMER_KEY =
  String(
    process.env.MPESA_CONSUMER_KEY ??
      "",
  ).trim();


const MPESA_CONSUMER_SECRET =
  String(
    process.env.MPESA_CONSUMER_SECRET ??
      "",
  ).trim();


const MPESA_BUSINESS_SHORTCODE =
  String(
    process.env.MPESA_BUSINESS_SHORTCODE ??
      "",
  ).trim();


const MPESA_TILL_NUMBER =
  String(
    process.env.MPESA_TILL_NUMBER ??
      "",
  ).trim();


const MPESA_PASSKEY =
  String(
    process.env.MPESA_PASSKEY ??
      "",
  ).trim();


const MPESA_CALLBACK_URL =
  String(
    process.env.MPESA_CALLBACK_URL ??
      "",
  ).trim();


/* ==========================================
   BASE URL
========================================== */

const MPESA_BASE_URL =
  MPESA_ENVIRONMENT ===
  "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";


const OAUTH_URL =
  `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`;


const STK_PUSH_URL =
  `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`;


const STK_QUERY_URL =
  `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`;


/* ==========================================
   CONFIG VALIDATION
========================================== */

function requireConfig(
  name,
  value,
) {
  if (!value) {
    throw new Error(
      `Missing M-Pesa configuration: ${name}`,
    );
  }

  return value;
}


function validateMpesaConfig() {
  requireConfig(
    "MPESA_CONSUMER_KEY",
    MPESA_CONSUMER_KEY,
  );

  requireConfig(
    "MPESA_CONSUMER_SECRET",
    MPESA_CONSUMER_SECRET,
  );

  requireConfig(
    "MPESA_BUSINESS_SHORTCODE",
    MPESA_BUSINESS_SHORTCODE,
  );

  requireConfig(
    "MPESA_TILL_NUMBER",
    MPESA_TILL_NUMBER,
  );

  requireConfig(
    "MPESA_PASSKEY",
    MPESA_PASSKEY,
  );

  requireConfig(
    "MPESA_CALLBACK_URL",
    MPESA_CALLBACK_URL,
  );
}


/* ==========================================
   TIMESTAMP
========================================== */

function createTimestamp() {
  const now =
    new Date();

  const year =
    String(
      now.getFullYear(),
    );

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      now.getDate(),
    ).padStart(
      2,
      "0",
    );

  const hours =
    String(
      now.getHours(),
    ).padStart(
      2,
      "0",
    );

  const minutes =
    String(
      now.getMinutes(),
    ).padStart(
      2,
      "0",
    );

  const seconds =
    String(
      now.getSeconds(),
    ).padStart(
      2,
      "0",
    );

  return (
    year +
    month +
    day +
    hours +
    minutes +
    seconds
  );
}


/* ==========================================
   PASSWORD
========================================== */

function createPassword(
  timestamp,
) {
  const rawPassword =
    `${MPESA_BUSINESS_SHORTCODE}${MPESA_PASSKEY}${timestamp}`;

  return Buffer
    .from(
      rawPassword,
      "utf8",
    )
    .toString(
      "base64",
    );
}


/* ==========================================
   PHONE NORMALIZATION
========================================== */

export function normalizeKenyanPhone(
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
   AMOUNT
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


  return Math.round(
    numericAmount,
  );
}


/* ==========================================
   RESPONSE PARSER
========================================== */

async function parseResponse(
  response,
) {
  const text =
    await response.text();


  if (!text) {
    return {};
  }


  try {
    return JSON.parse(
      text,
    );

  } catch {
    return {
      rawResponse:
        text,
    };
  }
}


/* ==========================================
   ACCESS TOKEN
========================================== */

export async function getMpesaAccessToken() {
  validateMpesaConfig();


  const credentials =
    Buffer
      .from(
        `${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`,
        "utf8",
      )
      .toString(
        "base64",
      );


  let response;

  try {
    response =
      await fetch(
        OAUTH_URL,
        {
          method:
            "GET",

          headers: {
            Authorization:
              `Basic ${credentials}`,

            Accept:
              "application/json",
          },
        },
      );

  } catch (error) {
    throw new Error(
      `Unable to connect to Safaricom: ${
        error?.message ??
        "Network error"
      }`,
    );
  }


  const data =
    await parseResponse(
      response,
    );


  if (
    !response.ok
  ) {
    console.error(
      "M-Pesa OAuth error:",
      data,
    );


    throw new Error(
      data?.errorMessage ||
      data?.error_description ||
      data?.message ||
      "Unable to authenticate with M-Pesa.",
    );
  }


  if (
    !data?.access_token
  ) {
    throw new Error(
      "Safaricom did not return an access token.",
    );
  }


  return data.access_token;
}


/* ==========================================
   INITIATE STK PUSH
========================================== */

export async function initiateStkPush({
  phoneNumber,
  amount,
  accountReference,
  transactionDescription,
}) {
  validateMpesaConfig();


  const phone =
    normalizeKenyanPhone(
      phoneNumber,
    );


  const normalizedAmount =
    normalizeAmount(
      amount,
    );


  const timestamp =
    createTimestamp();


  const password =
    createPassword(
      timestamp,
    );


  const accessToken =
    await getMpesaAccessToken();


  const requestBody = {
    BusinessShortCode:
      MPESA_BUSINESS_SHORTCODE,

    Password:
      password,

    Timestamp:
      timestamp,

    TransactionType:
      "CustomerPayBillOnline",

    Amount:
      normalizedAmount,

    PartyA:
      phone,

    PartyB:
      MPESA_TILL_NUMBER,

    PhoneNumber:
      phone,

    CallBackURL:
      MPESA_CALLBACK_URL,

    AccountReference:
      String(
        accountReference ??
          "HybridPOS",
      )
        .trim()
        .slice(
          0,
          12,
        ),

    TransactionDesc:
      String(
        transactionDescription ??
          "HybridPOS Sale",
      )
        .trim()
        .slice(
          0,
          30,
        ),
  };


  let response;

  try {
    response =
      await fetch(
        STK_PUSH_URL,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body:
            JSON.stringify(
              requestBody,
            ),
        },
      );

  } catch (error) {
    throw new Error(
      `Unable to send M-Pesa prompt: ${
        error?.message ??
        "Network error"
      }`,
    );
  }


  const data =
    await parseResponse(
      response,
    );


  if (
    !response.ok
  ) {
    console.error(
      "M-Pesa STK Push error:",
      data,
    );


    throw new Error(
      data?.errorMessage ||
      data?.ResponseDescription ||
      data?.message ||
      "M-Pesa STK Push failed.",
    );
  }


  if (
    String(
      data?.ResponseCode ??
        "",
    ) !== "0"
  ) {
    throw new Error(
      data?.ResponseDescription ||
      data?.errorMessage ||
      "Safaricom rejected the M-Pesa request.",
    );
  }


  return {
    success:
      true,

    merchantRequestId:
      data
        ?.MerchantRequestID ??
      null,

    checkoutRequestId:
      data
        ?.CheckoutRequestID ??
      null,

    responseCode:
      data
        ?.ResponseCode ??
      null,

    responseDescription:
      data
        ?.ResponseDescription ??
      null,

    customerMessage:
      data
        ?.CustomerMessage ??
      "M-Pesa request sent.",

    phoneNumber:
      phone,

    amount:
      normalizedAmount,
  };
}


/* ==========================================
   QUERY STK PUSH
========================================== */

export async function queryStkPush(
  checkoutRequestId,
) {
  validateMpesaConfig();


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


  const timestamp =
    createTimestamp();


  const password =
    createPassword(
      timestamp,
    );


  const accessToken =
    await getMpesaAccessToken();


  const requestBody = {
    BusinessShortCode:
      MPESA_BUSINESS_SHORTCODE,

    Password:
      password,

    Timestamp:
      timestamp,

    CheckoutRequestID:
      normalizedCheckoutRequestId,
  };


  let response;

  try {
    response =
      await fetch(
        STK_QUERY_URL,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body:
            JSON.stringify(
              requestBody,
            ),
        },
      );

  } catch (error) {
    throw new Error(
      `Unable to check M-Pesa payment: ${
        error?.message ??
        "Network error"
      }`,
    );
  }


  const data =
    await parseResponse(
      response,
    );


  if (
    !response.ok
  ) {
    console.error(
      "M-Pesa query error:",
      data,
    );


    throw new Error(
      data?.errorMessage ||
      data?.ResponseDescription ||
      data?.message ||
      "Unable to check M-Pesa payment status.",
    );
  }


  return {
    success:
      true,

    checkoutRequestId:
      normalizedCheckoutRequestId,

    resultCode:
      data
        ?.ResultCode ??
      null,

    resultDescription:
      data
        ?.ResultDesc ??
      data
        ?.ResponseDescription ??
      null,

    responseCode:
      data
        ?.ResponseCode ??
      null,

    raw:
      data,
  };
}


/* ==========================================
   SERVICE EXPORT
========================================== */

export const mpesaService = {
  getAccessToken:
    getMpesaAccessToken,

  initiateStkPush,

  queryStkPush,

  normalizeKenyanPhone,
};