import {
  initiateStkPush,
  queryStkPush,
} from "../services/mpesaService.js";


/* ==========================================
   REGISTER M-PESA IPC HANDLERS
========================================== */

export function registerMpesaHandlers(
  ipcMain,
) {

  /* ========================================
     INITIATE STK PUSH
  ======================================== */

  ipcMain.handle(
    "mpesa:stkPush",
    async (
      _event,
      payload,
    ) => {
      const phoneNumber =
        String(
          payload?.phoneNumber ??
            "",
        ).trim();

      const amount =
        Number(
          payload?.amount ??
            0,
        );

      const accountReference =
        String(
          payload?.accountReference ??
            "HybridPOS",
        ).trim();

      const transactionDescription =
        String(
          payload
            ?.transactionDescription ??
            "HybridPOS Sale",
        ).trim();


      if (!phoneNumber) {
        throw new Error(
          "Customer phone number is required.",
        );
      }


      if (
        !Number.isFinite(
          amount,
        ) ||
        amount <= 0
      ) {
        throw new Error(
          "M-Pesa amount must be greater than zero.",
        );
      }


      return initiateStkPush({
        phoneNumber,
        amount,
        accountReference,
        transactionDescription,
      });
    },
  );


  /* ========================================
     QUERY STK PUSH
  ======================================== */

  ipcMain.handle(
    "mpesa:query",
    async (
      _event,
      checkoutRequestId,
    ) => {
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


      return queryStkPush(
        normalizedCheckoutRequestId,
      );
    },
  );
}