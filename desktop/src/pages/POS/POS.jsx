import {
  Barcode,
  Check,
  CircleDollarSign,
  Minus,
  PackageSearch,
  Plus,
  RotateCcw,
  ShoppingCart,
  Trash2,
  WifiOff,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { productService } from "../../services/productService";

import ProductLookupModal
  from "./ProductLookupModal";

import ReceiptPreferenceSelect
  from "../../components/settings/ReceiptPreferenceSelect";

import { saleService } from "../../services/saleService";

import {
  settingsService,
} from "../../services/settingsService";

import ReceiptModal
  from "../../components/receipt/ReceiptModal";


import ReceiptPrinterSettingsModal
  from "../../components/receipt/ReceiptPrinterSettingsModal";

import {
  mpesaService,
} from "../../services/mpesaService";

import "./POS.css";


const VAT_RATE_BASIS_POINTS = 1600;
const SCANNER_RESET_DELAY = 80;


function playWarningSound() {
  try {
    const audioContext = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

    const oscillator =
      audioContext.createOscillator();

    const gain =
      audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 700;

    gain.gain.setValueAtTime(
      0.15,
      audioContext.currentTime,
    );

    oscillator.connect(gain);
    gain.connect(
      audioContext.destination,
    );

    oscillator.start();

    oscillator.stop(
      audioContext.currentTime +
      0.18,
    );
  } catch (error) {
    console.warn(
      "Warning sound could not play:",
      error,
    );
  }
}



/* ==========================================
   MONEY
========================================== */

function formatMoney(cents) {
  const numericCents = Number(cents);

  if (!Number.isFinite(numericCents)) {
    return "Ksh 0.00";
  }

  return `Ksh ${(numericCents / 100).toFixed(2)}`;
}


/* ==========================================
   PRODUCT NORMALIZATION
========================================== */

function normalizeProduct(product) {
  return {
    id: product.id,

    name:
      product.name ??
      "Unnamed product",

    sku:
      product.sku ?? "",

    barcode:
      String(
        product.barcode ?? "",
      ).trim(),

    selling_price_cents:
      Number(
        product.selling_price_cents ??
          0,
      ),

    inventory_quantity:
      Number(
        product.inventory_quantity ??
          0,
      ),

    is_taxable:
      product.is_taxable == null
        ? true
        : Boolean(
            product.is_taxable,
          ),

    track_inventory:
      Boolean(
        product.track_inventory,
      ),

    is_active:
      Boolean(product.is_active),
  };
}


/* ==========================================
   DISCOUNT ALLOCATION
========================================== */

function allocateDiscountAcrossItems(
  items,
  totalDiscountCents,
) {
  if (
    totalDiscountCents <= 0 ||
    items.length === 0
  ) {
    return items.map(() => 0);
  }

  const subtotalCents =
    items.reduce(
      (total, item) =>
        total +
        item.lineSubtotalCents,
      0,
    );

  if (subtotalCents <= 0) {
    return items.map(() => 0);
  }

  const allocations =
    items.map((item, index) => {
      const exactAllocation =
        (
          item.lineSubtotalCents *
          totalDiscountCents
        ) /
        subtotalCents;

      const floorAllocation =
        Math.floor(
          exactAllocation,
        );

      return {
        index,
        floorAllocation,
        fraction:
          exactAllocation -
          floorAllocation,
      };
    });

  const allocatedCents =
    allocations.reduce(
      (total, allocation) =>
        total +
        allocation.floorAllocation,
      0,
    );

  let remainingCents =
    totalDiscountCents -
    allocatedCents;

  allocations.sort(
    (first, second) =>
      second.fraction -
      first.fraction,
  );

  for (
    let index = 0;
    index < allocations.length &&
    remainingCents > 0;
    index += 1
  ) {
    allocations[index]
      .floorAllocation += 1;

    remainingCents -= 1;
  }

  const results =
    new Array(
      items.length,
    ).fill(0);

  for (
    const allocation
    of allocations
  ) {
    results[
      allocation.index
    ] =
      Math.min(
        allocation.floorAllocation,
        items[
          allocation.index
        ].lineSubtotalCents,
      );
  }

  return results;
}


/* ==========================================
   CHECKOUT
========================================== */

function MpesaPaymentStatus({
  paymentStatus,
  statusMessage,
  phoneNumber,
  checkoutRequestId,
  mpesaReceivedCents,
  amountRemainingCents,
}) {
  const statusLabel =
    paymentStatus === "PAID"
      ? "Payment confirmed"
      : paymentStatus === "WAITING"
        ? "Waiting for customer"
        : paymentStatus === "SENDING"
          ? "Sending M-Pesa prompt"
          : paymentStatus === "FAILED"
            ? "Payment not confirmed"
            : "Ready";

  return (
    <div
      className={`checkout-mpesa-card ${paymentStatus.toLowerCase()}`}
      role="status"
      aria-live="polite"
    >
      <strong>
        Safaricom M-Pesa
      </strong>

      <p>
        {statusLabel}
      </p>

      {statusMessage && (
        <span>
          {statusMessage}
        </span>
      )}

      {phoneNumber && (
        <span>
          Phone: {phoneNumber}
        </span>
      )}

      <span>
        Confirmed M-Pesa:{" "}
        {formatMoney(
          mpesaReceivedCents,
        )}
      </span>

      <span>
        Amount Remaining:{" "}
        {formatMoney(
          amountRemainingCents,
        )}
      </span>

      {checkoutRequestId && (
        <small>
          Request: {checkoutRequestId}
        </small>
      )}
    </div>
  );
}


function Checkout({
  onBackToDashboard,
  onLogout,
}) {

  /* ========================================
     CART
  ======================================== */

  const [cartItems, setCartItems] =
    useState([]);


  const [
    isPaymentOpen,
    setIsPaymentOpen,
  ] = useState(false);


  /* ========================================
     SCANNER STATUS
  ======================================== */

  const [
  completedReceiptSale,
  setCompletedReceiptSale,
] = useState(null);

const [
  isReceiptModalOpen,
  setIsReceiptModalOpen,
] = useState(false);

const [
  autoPrintReceipt,
  setAutoPrintReceipt,
] = useState(false);

const [
  isPrinterSettingsOpen,
  setIsPrinterSettingsOpen,
] = useState(false);

  const [
    scanMessage,
    setScanMessage,
  ] = useState(
    "Scanner ready",
  );

  const [
    scanStatus,
    setScanStatus,
  ] = useState(
    "ready",
  );

  const [
    lastScannedProductId,
    setLastScannedProductId,
  ] = useState(null);


  /* ========================================
     PAYMENT
  ======================================== */

  const [
    cashReceived,
    setCashReceived,
  ] = useState("");

  const [
    mpesaReceived,
    setMpesaReceived,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("CASH");

/* ========================================
   M-PESA STK PUSH
======================================== */

const [
  mpesaPhoneNumber,
  setMpesaPhoneNumber,
] = useState("");


const [
  mpesaCheckoutRequestId,
  setMpesaCheckoutRequestId,
] = useState(null);


const [
  mpesaPaymentStatus,
  setMpesaPaymentStatus,
] = useState("IDLE");


const [
  mpesaStatusMessage,
  setMpesaStatusMessage,
] = useState("");


const [
  isSendingMpesaPush,
  setIsSendingMpesaPush,
] = useState(false);


const [
  isCheckingMpesaPayment,
  setIsCheckingMpesaPayment,
] = useState(false);
  /* ========================================
     DISCOUNT
  ======================================== */

  const [
    discountType,
    setDiscountType,
  ] = useState("NONE");

  const [
    discountValue,
    setDiscountValue,
  ] = useState("");

  const [
    discountReason,
    setDiscountReason,
  ] = useState("");


  const [
    isCompletingSale,
    setIsCompletingSale,
  ] = useState(false);


  /* ========================================
     PRODUCT LOOKUP
  ======================================== */

  const [
    lookupProducts,
    setLookupProducts,
  ] = useState([]);

  const [
    isProductLookupOpen,
    setIsProductLookupOpen,
  ] = useState(false);

  const [
    isLoadingLookupProducts,
    setIsLoadingLookupProducts,
  ] = useState(false);


  /* ========================================
     HELD SALES
  ======================================== */

  const [
    heldSales,
    setHeldSales,
  ] = useState([]);

  const [
    isHeldSalesOpen,
    setIsHeldSalesOpen,
  ] = useState(false);

  const [
    isLoadingHeldSales,
    setIsLoadingHeldSales,
  ] = useState(false);

  const [
    activeHeldSaleId,
    setActiveHeldSaleId,
  ] = useState(null);


  /* ========================================
     REFS
  ======================================== */

  const scannerBufferRef =
    useRef("");

  const scannerResetTimerRef =
    useRef(null);

  const scanMessageTimerRef =
    useRef(null);

  const highlightTimerRef =
    useRef(null);


  /* ========================================
     SALE CALCULATIONS
  ======================================== */
const isMpesaPaymentConfirmed =
  mpesaPaymentStatus === "PAID";

  const totalItemQuantity =
    useMemo(() => {
      return cartItems.reduce(
        (total, item) =>
          total + item.quantity,
        0,
      );
    }, [cartItems]);


  const subtotalCents =
    useMemo(() => {
      return cartItems.reduce(
        (total, item) => {
          return (
            total +
            item.selling_price_cents *
              item.quantity
          );
        },
        0,
      );
    }, [cartItems]);


  const discountRateBasisPoints =
    useMemo(() => {
      if (
        discountType !== "PERCENT"
      ) {
        return null;
      }

      const numericPercent =
        Number(discountValue);

      if (
        discountValue === "" ||
        !Number.isFinite(
          numericPercent,
        ) ||
        numericPercent < 0
      ) {
        return 0;
      }

      const limitedPercent =
        Math.min(
          numericPercent,
          100,
        );

      return Math.round(
        limitedPercent * 100,
      );
    }, [
      discountType,
      discountValue,
    ]);


  const discountCents =
    useMemo(() => {
      if (
        subtotalCents <= 0 ||
        discountType === "NONE"
      ) {
        return 0;
      }

      const numericValue =
        Number(discountValue);

      if (
        discountValue === "" ||
        !Number.isFinite(
          numericValue,
        ) ||
        numericValue < 0
      ) {
        return 0;
      }

      if (
        discountType === "PERCENT"
      ) {
        const limitedPercent =
          Math.min(
            numericValue,
            100,
          );

        return Math.min(
          Math.round(
            subtotalCents *
              (
                limitedPercent /
                100
              ),
          ),
          subtotalCents,
        );
      }

      const fixedDiscountCents =
        Math.round(
          numericValue * 100,
        );

      return Math.min(
        fixedDiscountCents,
        subtotalCents,
      );
    }, [
      discountType,
      discountValue,
      subtotalCents,
    ]);


  const saleCalculation =
    useMemo(() => {
      const calculationItems =
        cartItems.map(
          (item) => ({
            lineSubtotalCents:
              Math.round(
                item.selling_price_cents *
                item.quantity,
              ),

            isTaxable:
              item.is_taxable !==
              false,
          }),
        );

      const itemDiscounts =
        allocateDiscountAcrossItems(
          calculationItems,
          discountCents,
        );

      let taxCents = 0;

      for (
        let index = 0;
        index <
        calculationItems.length;
        index += 1
      ) {
        const item =
          calculationItems[index];

        const discountedLineCents =
          Math.max(
            item.lineSubtotalCents -
              itemDiscounts[index],
            0,
          );

        if (item.isTaxable) {
          taxCents +=
            Math.round(
              discountedLineCents *
              (
                VAT_RATE_BASIS_POINTS /
                10000
              ),
            );
        }
      }

      const discountedSubtotalCents =
        Math.max(
          subtotalCents -
            discountCents,
          0,
        );

      const totalCents =
        discountedSubtotalCents +
        taxCents;

      return {
        discountedSubtotalCents,
        taxCents,
        totalCents,
      };
    }, [
      cartItems,
      discountCents,
      subtotalCents,
    ]);


  const discountedSubtotalCents =
    saleCalculation
      .discountedSubtotalCents;

  const taxCents =
    saleCalculation.taxCents;

  const totalCents =
    saleCalculation.totalCents;


  const cashReceivedCents =
    useMemo(() => {
      const numericCash =
        Number(cashReceived);

      if (
        cashReceived === "" ||
        !Number.isFinite(
          numericCash,
        ) ||
        numericCash < 0
      ) {
        return 0;
      }

      return Math.round(
        numericCash * 100,
      );
    }, [cashReceived]);


  const mpesaReceivedCents =
    useMemo(() => {
      const numericMpesa =
        Number(mpesaReceived);

      if (
        mpesaReceived === "" ||
        !Number.isFinite(
          numericMpesa,
        ) ||
        numericMpesa < 0
      ) {
        return 0;
      }

      return Math.round(
        numericMpesa * 100,
      );
    }, [mpesaReceived]);


  const totalPaidCents =
    paymentMethod === "CASH"
      ? cashReceivedCents
      : paymentMethod === "MPESA"
        ? (
            isMpesaPaymentConfirmed
              ? mpesaReceivedCents
              : 0
          )
        : cashReceivedCents +
          (
            isMpesaPaymentConfirmed
              ? mpesaReceivedCents
              : 0
          );


  const amountRemainingCents =
    Math.max(
      totalCents -
        totalPaidCents,
      0,
    );


  const cashNeededCents =
    paymentMethod === "SPLIT"
      ? Math.max(
          totalCents -
            mpesaReceivedCents,
          0,
        )
      : totalCents;


  const changeDueCents =
    paymentMethod === "CASH" ||
    paymentMethod === "SPLIT"
      ? Math.max(
          cashReceivedCents -
            cashNeededCents,
          0,
        )
      : 0;


  const hasItems =
    cartItems.length > 0;


  /*
   * Held Sales is only an empty-register view.
   * As soon as a product is scanned, looked up,
   * or a held sale is resumed, hide Held Sales
   * and return to Current Sale.
   */
  useEffect(() => {
    if (hasItems) {
      setIsHeldSalesOpen(
        false,
      );
    }
  }, [
    hasItems,
  ]);


  const canCompleteSale =
    hasItems &&
    !isCompletingSale &&
    (
      (
        paymentMethod === "CASH" &&
        cashReceivedCents >=
          totalCents
      ) ||
      (
        paymentMethod === "MPESA" &&
        isMpesaPaymentConfirmed &&
        mpesaReceivedCents ===
          totalCents
      ) ||
      (
        paymentMethod === "SPLIT" &&
        isMpesaPaymentConfirmed &&
        cashReceivedCents > 0 &&
        mpesaReceivedCents > 0 &&
        totalPaidCents >=
          totalCents
      )
    );


  /* ========================================
     QUICK CASH OPTIONS
  ======================================== */

  const quickCashOptions =
    useMemo(() => {
      if (totalCents <= 0) {
        return [];
      }

      const totalDollars =
        totalCents / 100;

      const denominations = [
        5,
        10,
        20,
        50,
        100,
        200,
        500,
        1000,
      ];

      return denominations
        .filter(
          (amount) =>
            amount >=
            totalDollars,
        )
        .slice(0, 3);
    }, [totalCents]);


  function setExactCash() {
    const amountCents =
      paymentMethod === "SPLIT"
        ? Math.max(
            totalCents -
              mpesaReceivedCents,
            0,
          )
        : totalCents;

    setCashReceived(
      (
        amountCents / 100
      ).toFixed(2),
    );
  }


  function setQuickCash(
    amount,
  ) {
    setCashReceived(
      Number(
        amount,
      ).toFixed(2),
    );
  }


  /* ========================================
     RESET M-PESA PAYMENT
  ======================================== */

  function resetMpesaPayment() {
    setMpesaReceived("");

    setMpesaPhoneNumber("");

    setMpesaCheckoutRequestId(
      null,
    );

    setMpesaPaymentStatus(
      "IDLE",
    );

    setMpesaStatusMessage("");

    setIsSendingMpesaPush(
      false,
    );

    setIsCheckingMpesaPayment(
      false,
    );
  }


  /* ========================================
     SEND M-PESA STK PUSH
  ======================================== */

  async function sendMpesaPush() {
    if (
      !hasItems ||
      (
        paymentMethod !== "MPESA" &&
        paymentMethod !== "SPLIT"
      ) ||
      isSendingMpesaPush ||
      isCheckingMpesaPayment
    ) {
      return;
    }


    const normalizedPhone =
      String(
        mpesaPhoneNumber ?? "",
      ).trim();


    if (!normalizedPhone) {
      setMpesaPaymentStatus(
        "FAILED",
      );

      setMpesaStatusMessage(
        "Enter the customer's M-Pesa phone number.",
      );

      return;
    }


    const mpesaAmount =
      paymentMethod === "MPESA"
        ? totalCents / 100
        : Number(
            mpesaReceived,
          );


    if (
      !Number.isFinite(
        mpesaAmount,
      ) ||
      mpesaAmount <= 0
    ) {
      setMpesaPaymentStatus(
        "FAILED",
      );

      setMpesaStatusMessage(
        "Enter a valid M-Pesa amount.",
      );

      return;
    }


    if (
      paymentMethod === "SPLIT" &&
      Math.round(
        mpesaAmount * 100,
      ) >= totalCents
    ) {
      setMpesaPaymentStatus(
        "FAILED",
      );

      setMpesaStatusMessage(
        "For Split payment, the M-Pesa amount must be less than the total so there is a cash portion.",
      );

      return;
    }


    try {
      setIsSendingMpesaPush(
        true,
      );

      setMpesaCheckoutRequestId(
        null,
      );

      setMpesaPaymentStatus(
        "SENDING",
      );

      setMpesaStatusMessage(
        "Sending an M-Pesa prompt to the customer's phone...",
      );


      const response =
        await mpesaService
          .sendStkPush({
            phoneNumber:
              normalizedPhone,

            amount:
              mpesaAmount,

            accountReference:
              "HybridPOS",

            transactionDescription:
              paymentMethod === "SPLIT"
                ? "HybridPOS Split"
                : "HybridPOS Sale",
          });


      const checkoutRequestId =
        String(
          response
            ?.checkoutRequestId ??
            "",
        ).trim();


      if (!checkoutRequestId) {
        throw new Error(
          "Safaricom did not return a CheckoutRequestID.",
        );
      }


      setMpesaCheckoutRequestId(
        checkoutRequestId,
      );

      setMpesaPaymentStatus(
        "WAITING",
      );

      setMpesaStatusMessage(
        response?.customerMessage ||
          "M-Pesa prompt sent. Ask the customer to enter their PIN, then check the payment.",
      );

    } catch (error) {
      console.error(
        "Unable to send M-Pesa STK Push:",
        error,
      );

      setMpesaCheckoutRequestId(
        null,
      );

      setMpesaPaymentStatus(
        "FAILED",
      );

      setMpesaStatusMessage(
        error?.message ||
          "The M-Pesa prompt could not be sent.",
      );

    } finally {
      setIsSendingMpesaPush(
        false,
      );
    }
  }


  /* ========================================
     CHECK M-PESA PAYMENT
  ======================================== */

  async function checkMpesaPayment() {
    if (
      !mpesaCheckoutRequestId ||
      isCheckingMpesaPayment ||
      isSendingMpesaPush ||
      mpesaPaymentStatus === "PAID"
    ) {
      return;
    }


    try {
      setIsCheckingMpesaPayment(
        true,
      );

      setMpesaStatusMessage(
        "Checking payment with Safaricom...",
      );


      const response =
        await mpesaService
          .queryPayment(
            mpesaCheckoutRequestId,
          );


      const resultCode =
        response?.resultCode == null
          ? null
          : String(
              response.resultCode,
            );


      if (
        resultCode === "0"
      ) {
        const confirmedAmount =
          paymentMethod === "MPESA"
            ? totalCents / 100
            : Number(
                mpesaReceived,
              );


        setMpesaReceived(
          Number(
            confirmedAmount,
          ).toFixed(2),
        );

        setMpesaPaymentStatus(
          "PAID",
        );

        setMpesaStatusMessage(
          response?.resultDescription ||
            "M-Pesa payment confirmed successfully.",
        );

        showTemporaryScanMessage(
          "M-Pesa payment confirmed",
          "success",
        );

        return;
      }


      if (
        resultCode == null ||
        resultCode === ""
      ) {
        setMpesaPaymentStatus(
          "WAITING",
        );

        setMpesaStatusMessage(
          response?.resultDescription ||
            "Payment is still being processed. Check again shortly.",
        );

        return;
      }


      setMpesaPaymentStatus(
        "FAILED",
      );

      setMpesaStatusMessage(
        response?.resultDescription ||
          `M-Pesa payment was not completed (code ${resultCode}).`,
      );

    } catch (error) {
      console.error(
        "Unable to check M-Pesa payment:",
        error,
      );

      /*
       * A temporary query/network failure does not prove
       * that the customer payment failed. Keep the request
       * in WAITING state so the cashier can check again.
       */
      setMpesaPaymentStatus(
        "WAITING",
      );

      setMpesaStatusMessage(
        error?.message ||
          "Payment could not be confirmed yet. Check again.",
      );

    } finally {
      setIsCheckingMpesaPayment(
        false,
      );
    }
  }


  function selectDiscountType(
    nextType,
  ) {
    setDiscountType(
      nextType,
    );

    setDiscountValue("");

    if (
      nextType === "NONE"
    ) {
      setDiscountReason("");
    }
  }


  function resetDiscount() {
    setDiscountType("NONE");
    setDiscountValue("");
    setDiscountReason("");
  }


  /* ========================================
     SCAN MESSAGE
  ======================================== */

  const showTemporaryScanMessage =
    useCallback(
      (
        message,
        status = "ready",
      ) => {
        setScanMessage(message);
        setScanStatus(status);

        if (status === "error") {
          playWarningSound();
        }

        window.clearTimeout(
          scanMessageTimerRef.current,
        );

        scanMessageTimerRef.current =
          window.setTimeout(
            () => {
              setScanMessage(
                "Scanner ready",
              );

              setScanStatus(
                "ready",
              );
            },
            2500,
          );
      },
      [],
    );


  /* ========================================
     HIGHLIGHT LAST SCANNED PRODUCT
  ======================================== */

  const highlightScannedProduct =
    useCallback(
      (productId) => {
        setLastScannedProductId(
          productId,
        );

        window.clearTimeout(
          highlightTimerRef.current,
        );

        highlightTimerRef.current =
          window.setTimeout(
            () => {
              setLastScannedProductId(
                null,
              );
            },
            1100,
          );
      },
      [],
    );


  /* ========================================
     ADD PRODUCT TO CART
  ======================================== */

  const addProductToCart =
    useCallback(
      (rawProduct) => {
        const product =
          normalizeProduct(
            rawProduct,
          );


        if (
          !product.is_active
        ) {
          showTemporaryScanMessage(
            `${product.name} is inactive.`,
            "error",
          );

          return;
        }


        if (
          product.track_inventory &&
          product.inventory_quantity <=
            0
        ) {
          showTemporaryScanMessage(
            `${product.name} is out of stock.`,
            "error",
          );

          return;
        }


        setCartItems(
          (currentItems) => {

            const existingItem =
              currentItems.find(
                (item) =>
                  item.id ===
                  product.id,
              );


            if (existingItem) {

              if (
                product.track_inventory &&
                existingItem.quantity >=
                  product.inventory_quantity
              ) {
                showTemporaryScanMessage(
                  `Only ${product.inventory_quantity} unit(s) are available.`,
                  "error",
                );

                return currentItems;
              }


              return currentItems.map(
                (item) =>
                  item.id ===
                  product.id
                    ? {
                        ...item,

                        quantity:
                          item.quantity +
                          1,
                      }
                    : item,
              );
            }


            return [
              ...currentItems,

              {
                ...product,
                quantity: 1,
              },
            ];
          },
        );


        highlightScannedProduct(
          product.id,
        );


        showTemporaryScanMessage(
          `${product.name} added`,
          "success",
        );
      },
      [
        highlightScannedProduct,
        showTemporaryScanMessage,
      ],
    );


  /* ========================================
     FIND PRODUCT BY BARCODE
  ======================================== */

  const findProductByBarcode =
    useCallback(
      async (barcode) => {

        const normalizedBarcode =
          String(
            barcode ?? "",
          ).trim();


        if (
          !normalizedBarcode
        ) {
          return;
        }


        try {

          setScanMessage(
            "Searching product...",
          );

          setScanStatus(
            "loading",
          );


          const getProductByBarcode =
            window.api
              ?.getProductByBarcode;


          if (
            typeof getProductByBarcode !==
            "function"
          ) {
            throw new Error(
              'The API method "getProductByBarcode" is unavailable.',
            );
          }


          const product =
            await getProductByBarcode(
              normalizedBarcode,
            );


          if (!product) {
            showTemporaryScanMessage(
              `Product not found: ${normalizedBarcode}`,
              "error",
            );

            return;
          }


          addProductToCart(
            product,
          );

        } catch (error) {

          console.error(
            "Unable to scan product:",
            error,
          );


          showTemporaryScanMessage(
            error?.message ||
              "The product could not be scanned.",
            "error",
          );
        }
      },
      [
        addProductToCart,
        showTemporaryScanMessage,
      ],
    );


  /* ========================================
     PRODUCT LOOKUP
  ======================================== */

  const closeProductLookup =
    useCallback(() => {
      setIsProductLookupOpen(
        false,
      );
    }, []);


  const handleLookupProductSelected =
    useCallback(
      (product) => {
        addProductToCart(
          product,
        );

        setIsProductLookupOpen(
          false,
        );
      },
      [
        addProductToCart,
      ],
    );


  const openProductLookup =
    useCallback(
      async () => {

        if (
          isLoadingLookupProducts ||
          isProductLookupOpen
        ) {
          return;
        }


        try {

          setIsLoadingLookupProducts(
            true,
          );


          const databaseProducts =
            await productService
              .getAll();


          setLookupProducts(
            Array.isArray(
              databaseProducts,
            )
              ? databaseProducts
              : [],
          );


          setIsProductLookupOpen(
            true,
          );

        } catch (error) {

          console.error(
            "Unable to load products for lookup:",
            error,
          );


          showTemporaryScanMessage(
            error?.message ||
              "Products could not be loaded.",
            "error",
          );

        } finally {

          setIsLoadingLookupProducts(
            false,
          );
        }
      },
      [
        isLoadingLookupProducts,
        isProductLookupOpen,
        showTemporaryScanMessage,
      ],
    );


  /* ========================================
     BARCODE SCANNER LISTENER
  ======================================== */

  useEffect(() => {

    function handleScannerKeyDown(
      event,
    ) {

      if (
        isProductLookupOpen
      ) {
        return;
      }


      const target =
        event.target;


      const isTypingInForm =
        target instanceof
          HTMLInputElement ||
        target instanceof
          HTMLTextAreaElement ||
        target instanceof
          HTMLSelectElement ||
        target?.isContentEditable;


      if (
        isTypingInForm
      ) {
        return;
      }


      if (
        event.key === "F2"
      ) {
        return;
      }


      if (
        event.key === "Enter"
      ) {

        const barcode =
          scannerBufferRef
            .current
            .trim();


        scannerBufferRef.current =
          "";


        window.clearTimeout(
          scannerResetTimerRef.current,
        );


        if (barcode) {

          event.preventDefault();

          findProductByBarcode(
            barcode,
          );
        }


        return;
      }


      if (
        event.key.length !== 1
      ) {
        return;
      }


      scannerBufferRef.current +=
        event.key;


      window.clearTimeout(
        scannerResetTimerRef.current,
      );


      scannerResetTimerRef.current =
        window.setTimeout(
          () => {
            scannerBufferRef.current =
              "";
          },
          SCANNER_RESET_DELAY,
        );
    }


    window.addEventListener(
      "keydown",
      handleScannerKeyDown,
    );


    return () => {
      window.removeEventListener(
        "keydown",
        handleScannerKeyDown,
      );

      window.clearTimeout(
        scannerResetTimerRef.current,
      );
    };

  }, [
    findProductByBarcode,
    isProductLookupOpen,
  ]);


  /* ========================================
     F2 PRODUCT LOOKUP
  ======================================== */

  useEffect(() => {

    function handleLookupShortcut(
      event,
    ) {

      if (
        event.key !== "F2"
      ) {
        return;
      }


      event.preventDefault();


      if (
        !isProductLookupOpen
      ) {
        openProductLookup();
      }
    }


    window.addEventListener(
      "keydown",
      handleLookupShortcut,
    );


    return () => {
      window.removeEventListener(
        "keydown",
        handleLookupShortcut,
      );
    };

  }, [
    isProductLookupOpen,
    openProductLookup,
  ]);


  /* ========================================
     CLEANUP TIMERS
  ======================================== */

  useEffect(() => {
    return () => {

      window.clearTimeout(
        scannerResetTimerRef.current,
      );

      window.clearTimeout(
        scanMessageTimerRef.current,
      );

      window.clearTimeout(
        highlightTimerRef.current,
      );
    };
  }, []);


  /* ========================================
     HELD SALES
  ======================================== */

  const refreshHeldSales =
    useCallback(
      async () => {
        const getHeldSales =
          window.api?.getHeldSales;

        if (
          typeof getHeldSales !==
          "function"
        ) {
          return [];
        }

        const sales =
          await getHeldSales();

        const normalizedSales =
          Array.isArray(sales)
            ? sales
            : [];

        setHeldSales(
          normalizedSales,
        );

        return normalizedSales;
      },
      [],
    );


  useEffect(() => {
    refreshHeldSales()
      .catch((error) => {
        console.error(
          "Unable to preload held sales:",
          error,
        );
      });
  }, [
    refreshHeldSales,
  ]);


  async function openHeldSales() {
    try {
      setIsLoadingHeldSales(
        true,
      );

      await refreshHeldSales();

      setIsHeldSalesOpen(
        true,
      );

    } catch (error) {
      console.error(
        "Unable to load held sales:",
        error,
      );

      showTemporaryScanMessage(
        error?.message ||
          "Held sales could not be loaded.",
        "error",
      );

    } finally {
      setIsLoadingHeldSales(
        false,
      );
    }
  }


  async function resumeHeldSale(
    heldSaleId,
  ) {
    if (hasItems) {
      const confirmed =
        window.confirm(
          "There is already an active sale. Replace it with this held sale?",
        );

      if (!confirmed) {
        return;
      }
    }

    try {
      const getHeldSaleById =
        window.api?.getHeldSaleById;

      if (
        typeof getHeldSaleById !==
        "function"
      ) {
        throw new Error(
          "Resume Sale API is unavailable.",
        );
      }

      const heldSale =
        await getHeldSaleById(
          heldSaleId,
        );

      const restoredItems =
        Array.isArray(
          heldSale?.items,
        )
          ? heldSale.items
          : [];

      if (
        restoredItems.length === 0
      ) {
        throw new Error(
          "This held sale has no items.",
        );
      }

      setCartItems(
        restoredItems,
      );

      setDiscountType(
        heldSale.discountType ??
          "NONE",
      );

      setDiscountValue(
        heldSale.discountValue ??
          "",
      );

      setDiscountReason("");

      setIsPaymentOpen(false);

      setCashReceived("");

      resetMpesaPayment();

      setPaymentMethod(
        "CASH",
      );

      setLastScannedProductId(
        null,
      );

      setActiveHeldSaleId(
        heldSaleId,
      );

      setIsHeldSalesOpen(
        false,
      );

      showTemporaryScanMessage(
        "Held sale resumed.",
        "success",
      );

    } catch (error) {
      console.error(
        "Unable to resume held sale:",
        error,
      );

      showTemporaryScanMessage(
        error?.message ||
          "Held sale could not be resumed.",
        "error",
      );
    }
  }


  async function cancelHeldSale(
    heldSaleId,
  ) {
    const confirmed =
      window.confirm(
        "Remove this held sale?",
      );

    if (!confirmed) {
      return;
    }

    try {
      const closeHeldSale =
        window.api?.closeHeldSale;

      if (
        typeof closeHeldSale !==
        "function"
      ) {
        throw new Error(
          "Held Sale API is unavailable.",
        );
      }

      await closeHeldSale(
        heldSaleId,
        "CANCELLED",
      );

      if (
        activeHeldSaleId ===
        heldSaleId
      ) {
        setActiveHeldSaleId(
          null,
        );
      }

      await refreshHeldSales();

    } catch (error) {
      console.error(
        "Unable to remove held sale:",
        error,
      );

      showTemporaryScanMessage(
        error?.message ||
          "Held sale could not be removed.",
        "error",
      );
    }
  }


  /* ========================================
     QUANTITY
  ======================================== */

  function increaseQuantity(
    productId,
  ) {

    setCartItems(
      (currentItems) =>
        currentItems.map(
          (item) => {

            if (
              item.id !==
              productId
            ) {
              return item;
            }


            if (
              item.track_inventory &&
              item.quantity >=
                item.inventory_quantity
            ) {

              showTemporaryScanMessage(
                `Only ${item.inventory_quantity} unit(s) of ${item.name} are available.`,
                "error",
              );

              return item;
            }


            return {
              ...item,

              quantity:
                item.quantity +
                1,
            };
          },
        ),
    );
  }


  function decreaseQuantity(
    productId,
  ) {

    setCartItems(
      (currentItems) =>
        currentItems
          .map(
            (item) =>
              item.id ===
              productId
                ? {
                    ...item,

                    quantity:
                      item.quantity -
                      1,
                  }
                : item,
          )
          .filter(
            (item) =>
              item.quantity >
              0,
          ),
    );
  }


  /* ========================================
     REMOVE ITEM
  ======================================== */

  function removeItem(
    productId,
  ) {

    setCartItems(
      (currentItems) =>
        currentItems.filter(
          (item) =>
            item.id !==
            productId,
        ),
    );
  }



  /* ========================================
     HOLD SALE
  ======================================== */

  async function handleHoldSale() {
    if (!hasItems) {
      return;
    }

    const confirmed =
      window.confirm(
        "Hold this sale and clear the register for the next customer?",
      );

    if (!confirmed) {
      return;
    }

    try {
      const holdSale =
        window.api?.holdSale;

      if (
        typeof holdSale !==
        "function"
      ) {
        throw new Error(
          "Hold Sale API is unavailable.",
        );
      }

      await holdSale({
        items:
          cartItems,

        discountType,

        discountValue,

        discountCents,

        customer:
          null,
      });


      /*
       * If this cart came from a previously
       * held sale, retire the old held record
       * only after the new snapshot is saved.
       */
      if (activeHeldSaleId) {
        const closeHeldSale =
          window.api?.closeHeldSale;

        if (
          typeof closeHeldSale ===
          "function"
        ) {
          await closeHeldSale(
            activeHeldSaleId,
            "CANCELLED",
          );
        }
      }


      setCartItems([]);

      setIsPaymentOpen(false);

      setCashReceived("");

      resetMpesaPayment();

      setPaymentMethod(
        "CASH",
      );

      resetDiscount();

      setLastScannedProductId(
        null,
      );

      setActiveHeldSaleId(
        null,
      );

      await refreshHeldSales();

      showTemporaryScanMessage(
        "Sale held successfully.",
        "success",
      );

    } catch (error) {
      console.error(
        "Unable to hold sale:",
        error,
      );

      showTemporaryScanMessage(
        error?.message ||
          "The sale could not be held.",
        "error",
      );
    }
  }


  /* ========================================
     CANCEL SALE
  ======================================== */


  function cancelSale() {

    if (!hasItems) {
      return;
    }


    const confirmed =
      window.confirm(
        "Cancel this sale and remove all items?",
      );


    if (!confirmed) {
      return;
    }


    setCartItems([]);

    setIsPaymentOpen(false);

    setCashReceived("");

    resetMpesaPayment();

    setPaymentMethod(
      "CASH",
    );

    resetDiscount();

    setLastScannedProductId(
      null,
    );

    /*
     * If this was resumed from Held Sales,
     * leave the saved held record untouched
     * so it can still be resumed later.
     */
    setActiveHeldSaleId(
      null,
    );


    showTemporaryScanMessage(
      "Sale cancelled",
      "ready",
    );
  }


  /* ========================================
     COMPLETE SALE
  ======================================== */

  async function completeSale() {
    if (!canCompleteSale) {
      return;
    }

    try {
      setIsCompletingSale(true);

      const sale = {
        items:
          cartItems.map(
            (item) => ({
              productId:
                item.id,

              quantity:
                item.quantity,

              unitPriceCents:
                item.selling_price_cents,

              lineTotalCents:
                item.selling_price_cents *
                item.quantity,
            }),
          ),

        subtotalCents,

        discountType,

        discountCents,

        discountRateBasisPoints,

        discountReason:
          discountReason.trim() ||
          null,

        taxCents,

        totalCents,

        paymentMethod,

        payments: {
          cashCents:
            paymentMethod === "CASH" ||
            paymentMethod === "SPLIT"
              ? cashReceivedCents
              : 0,

          mpesaCents:
            paymentMethod === "MPESA" ||
            paymentMethod === "SPLIT"
              ? mpesaReceivedCents
              : 0,
        },

        totalPaidCents,

        changeDueCents,
      };


      const completedSale =
        await saleService.complete(
          sale,
        );


      /*
       * A resumed held sale stays in Held Sales
       * until checkout succeeds. Only now do we
       * mark the held record as completed.
       */
      if (activeHeldSaleId) {
        const closeHeldSale =
          window.api?.closeHeldSale;

        if (
          typeof closeHeldSale ===
          "function"
        ) {
          await closeHeldSale(
            activeHeldSaleId,
            "COMPLETED",
          );
        }

        setActiveHeldSaleId(
          null,
        );

        await refreshHeldSales();
      }


      const receiptSale = {
        ...completedSale,

        completedAt:
          new Date().toISOString(),

        subtotalCents,

        discountType,

        discountCents,

        discountRateBasisPoints,

        discountReason:
          discountReason.trim() ||
          null,

        taxCents,

        totalCents,

        paymentMethod,

        cashCents:
          sale.payments.cashCents,

        mpesaCents:
          sale.payments.mpesaCents,

        totalPaidCents,

        changeDueCents,

        vatRateBasisPoints:
          VAT_RATE_BASIS_POINTS,

        items:
          cartItems.map(
            (item) => ({
              productId:
                item.id,

              name:
                item.name,

              sku:
                item.sku,

              barcode:
                item.barcode,

              quantity:
                item.quantity,

              unitPriceCents:
                item.selling_price_cents,

              lineTotalCents:
                item.selling_price_cents *
                item.quantity,

              isTaxable:
                item.is_taxable,
            }),
          ),
      };


      let receiptPreference =
        "ASK";

      try {
        const settings =
          await settingsService.get();

        receiptPreference =
          settings?.receipt_preference ??
          "ASK";

      } catch (error) {
        console.error(
          "Unable to load receipt preference:",
          error,
        );

        receiptPreference =
          "ASK";
      }


      if (
        receiptPreference ===
        "ASK"
      ) {
        setCompletedReceiptSale(
          receiptSale,
        );

        setAutoPrintReceipt(
          false,
        );

        setIsReceiptModalOpen(
          true,
        );
      }


      if (
        receiptPreference ===
        "ALWAYS"
      ) {
        setCompletedReceiptSale(
          receiptSale,
        );

        setAutoPrintReceipt(
          true,
        );

        setIsReceiptModalOpen(
          true,
        );
      }


      if (
        receiptPreference ===
        "NEVER"
      ) {
        setCompletedReceiptSale(
          null,
        );

        setAutoPrintReceipt(
          false,
        );

        setIsReceiptModalOpen(
          false,
        );
      }


      setCartItems([]);
      setIsPaymentOpen(false);
      setCashReceived("");

      resetMpesaPayment();

      setPaymentMethod(
        "CASH",
      );

      resetDiscount();

      setLastScannedProductId(
        null,
      );


      showTemporaryScanMessage(
        completedSale?.saleNumber
          ? `Sale ${completedSale.saleNumber} completed successfully`
          : "Sale completed successfully",
        "success",
      );

    } catch (error) {
      console.error(
        "Unable to complete sale:",
        error,
      );

      showTemporaryScanMessage(
        error?.message ||
          "The sale could not be completed.",
        "error",
      );

    } finally {
      setIsCompletingSale(false);
    }
  }


  function closeReceiptModal() {
    setIsReceiptModalOpen(
      false,
    );

    setCompletedReceiptSale(
      null,
    );

    setAutoPrintReceipt(
      false,
    );
  }


  function handleReceiptPrinted() {
    setIsReceiptModalOpen(
      false,
    );

    setCompletedReceiptSale(
      null,
    );

    setAutoPrintReceipt(
      false,
    );
  }


  /* ========================================
     RENDER
  ======================================== */

  return (
    <div className="checkout-page">

      {/* ====================================
          HEADER
      ==================================== */}

      <header className="checkout-header">

        <div className="checkout-brand">

          <div className="checkout-brand-mark">
            H
          </div>

          <div>

            <h1>
              HybridPOS
            </h1>

           <h3>Kampi Mart </h3> 

          </div>

        </div>


        <div className="checkout-header-actions">

          
            
          

 <span className="checkout-register-badge">
            Register 01
          </span>
          <span className="checkout-offline-badge">

            <span />

            Offline Ready

          </span>


          <button
            type="button"
            className="checkout-header-button"
            onClick={
              onBackToDashboard
            }
          >
            Dashboard
          </button>


          <button
            type="button"
            className="checkout-header-button"
            onClick={
              onLogout
            }
          >
            Logout
          </button>

        </div>

      </header>


      {/* ====================================
          WORKSPACE
      ==================================== */}

      <main className="checkout-workspace">

<section className="checkout-sale-panel">

          <div className="checkout-sale-toolbar">

            <div>

              <h2>
                {hasItems
                  ? "Current Sale"
                  : "Ready to Scan"}
              </h2>


              <p>
                {hasItems
                  ? `${totalItemQuantity} item${
                      totalItemQuantity ===
                      1
                        ? ""
                        : "s"
                    } · ${cartItems.length} product type${
                      cartItems.length ===
                      1
                        ? ""
                        : "s"
                    }`
                  : "Scan an item or search manually"}
              </p>

            </div>


            <div className="checkout-toolbar-actions">

              {hasItems && (
                <button
                  type="button"
                  className="checkout-clear-button"
                  onClick={
                    cancelSale
                  }
                >
                  Clear Sale
                </button>
              )}

            </div>

          </div>


          {/* Scanner status */}

          <div
            className={`checkout-scanner-status ${scanStatus}`}
            role="status"
            aria-live="polite"
          >

            {scanStatus ===
            "success" ? (

              <Check
                size={17}
              />

            ) : scanStatus ===
              "error" ? (

              <WifiOff
                size={17}
              />

            ) : (

              <Barcode
                size={17}
              />

            )}


            <span>
              {scanMessage}
            </span>

          </div>


          {/* ==================================
              EMPTY CART
          ================================== */}

          {!hasItems ? (

            <div className="checkout-empty-state">

              <div className="checkout-empty-icon">

                <ShoppingCart
                  size={42}
                />

              </div>


              <h4 className="scan-header">

                <span>
          Ready to Scan
                </span>

                <span>
                 Scan an item or choose an action below
                </span>

              </h4>


              <button
                type="button"
                className="checkout-empty-search"
                onClick={
                  openProductLookup
                }
                disabled={
                  isLoadingLookupProducts
                }
              >

                <PackageSearch
                  size={20}
                />


                {isLoadingLookupProducts
                  ? "Loading items..."
                  : "Look up an item"}

              </button>

{!hasItems && (
  <div className="checkout-empty-quick-actions">

    <button
      type="button"
      onClick={() =>
        setIsProductLookupOpen(true)
      }
    >
      Search Item
    </button>

    <button
      type="button"
    >
      Recent Sales
    </button>

    <button
      type="button"
      onClick={
        openHeldSales
      }
      disabled={
        isLoadingHeldSales
      }
    >
      {isLoadingHeldSales
        ? "Loading..."
        : `Held Sales${
            heldSales.length > 0
              ? ` (${heldSales.length})`
              : ""
          }`}
    </button>

    <button
      type="button"
    >
      Customer
    </button>

  </div>
)}

            </div>

          ) : (

            /* =================================
               CURRENT SALE TABLE
            ================================= */

            <div className="checkout-sale-table">

              <div className="checkout-sale-table-header">

                <span>
                  Product
                </span>

                <span>
                  Quantity
                </span>

                <span>
                  Price
                </span>

                <span>
                  Total
                </span>

                <span
                  aria-label="Actions"
                />

              </div>


              <div
                className="checkout-sale-items"
                style={{
                  "--cart-item-count":
                    Math.min(
                      Math.max(
                        cartItems.length,
                        1,
                      ),
                      16,
                    ),
                }}
              >

                {cartItems.map(
                  (item) => (

                    <article
                      key={
                        item.id
                      }
                      className={`checkout-sale-item ${
                        lastScannedProductId ===
                        item.id
                          ? "recently-scanned"
                          : ""
                      }`}
                    >

                      {/* Product */}

                      <div className="checkout-item-product">

                        <strong>
                          {item.name}
                        </strong>


                        <span>

                          {item.sku
                            ? `SKU: ${item.sku}`
                            : item.barcode
                              ? `Barcode: ${item.barcode}`
                              : "No product identifier"}

                        </span>

                      </div>


                      {/* Quantity */}

                      <div className="checkout-quantity-control">

                        <button
                          type="button"
                          onClick={() =>
                            decreaseQuantity(
                              item.id,
                            )
                          }
                          aria-label={`Decrease ${item.name} quantity`}
                        >

                          <Minus
                            size={16}
                          />

                        </button>


                        <strong>
                          {item.quantity}
                        </strong>


                        <button
                          type="button"
                          onClick={() =>
                            increaseQuantity(
                              item.id,
                            )
                          }
                          aria-label={`Increase ${item.name} quantity`}
                        >

                          <Plus
                            size={16}
                          />

                        </button>

                      </div>


                      {/* Unit price */}

                      <span className="checkout-unit-price">

                        {formatMoney(
                          item.selling_price_cents,
                        )}

                      </span>


                      {/* Line total */}

                      <strong className="checkout-line-total">

                        {formatMoney(
                          item.selling_price_cents *
                            item.quantity,
                        )}

                      </strong>


                      {/* Remove */}

                      <button
                        type="button"
                        className="checkout-remove-item"
                        onClick={() =>
                          removeItem(
                            item.id,
                          )
                        }
                        aria-label={`Remove ${item.name}`}
                      >

                        <Trash2
                          size={18}
                        />

                      </button>

                    </article>

                  ),
                )}

              </div>

            </div>

          )}


          {/* ==================================
              BOTTOM TOOLBAR
          ================================== */}
<footer className="checkout-bottom-toolbar">

  <button
    type="button"
    onClick={
      cancelSale
    }
    disabled={
      !hasItems
    }
  >
    <RotateCcw
      size={18}
    />

    Cancel Sale
  </button>


  {hasItems && (
    <button
      type="button"
      onClick={
        openProductLookup
      }
      disabled={
        isLoadingLookupProducts
      }
    >
      <PackageSearch
        size={18}
      />

      Look up an item
    </button>
  )}


  {hasItems && (
    <button
      type="button"
      className="checkout-hold-sale-button"
      onClick={
        handleHoldSale
      }
    >
      Hold Sale
    </button>
  )}


  <ReceiptPreferenceSelect />


  <button
    type="button"
    className="checkout-printer-settings-button"
    onClick={() =>
      setIsPrinterSettingsOpen(
        true,
      )
    }
  >
    Printer Settings
  </button>

</footer>
        </section>


<aside className="checkout-summary-panel checkout-summary-panel-compact">

          <div className="checkout-summary-header">

            <div>
              <h2>
                Order Summary
              </h2>

              <p>
                Review totals before payment.
              </p>
            </div>

            <span>
              {totalItemQuantity}{" "}
              {totalItemQuantity === 1
                ? "item"
                : "items"}
            </span>

          </div>


          <div className="checkout-summary-breakdown">

            <div>
              <span>
                Subtotal
              </span>

              <strong>
                {formatMoney(
                  subtotalCents,
                )}
              </strong>
            </div>


            <div>
              <span>
                Discount
              </span>

              <strong>
                {discountCents > 0
                  ? `-${formatMoney(
                      discountCents,
                    )}`
                  : formatMoney(0)}
              </strong>
            </div>


            <div>
              <span>
                VAT (16%)
              </span>

              <strong>
                {formatMoney(
                  taxCents,
                )}
              </strong>
            </div>

          </div>


          <div className="checkout-summary-total">

            <span>
              Total Due
            </span>

            <strong>
              {formatMoney(
                totalCents,
              )}
            </strong>

          </div>


          {!isPaymentOpen && (

            <>
              <div className="checkout-summary-discount">

                <span className="checkout-payment-label">
                  Discount
                </span>


                <div className="checkout-discount-types">

                  <button
                    type="button"
                    className={
                      discountType === "NONE"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      selectDiscountType(
                        "NONE",
                      )
                    }
                  >
                    None
                  </button>


                  <button
                    type="button"
                    className={
                      discountType === "FIXED"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      selectDiscountType(
                        "FIXED",
                      )
                    }
                  >
                    Ksh
                  </button>


                  <button
                    type="button"
                    className={
                      discountType === "PERCENT"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      selectDiscountType(
                        "PERCENT",
                      )
                    }
                  >
                    %
                  </button>

                </div>


                {discountType !== "NONE" && (

                  <label className="checkout-payment-field checkout-summary-discount-field">

                    <span>
                      {discountType === "PERCENT"
                        ? "Discount %"
                        : "Discount Amount"}
                    </span>


                    <div>

                      <input
                        type="number"
                        min="0"
                        step={
                          discountType === "PERCENT"
                            ? "0.1"
                            : "0.01"
                        }
                        value={
                          discountValue
                        }
                        onChange={(
                          event,
                        ) =>
                          setDiscountValue(
                            event.target.value,
                          )
                        }
                        placeholder="0"
                      />

                    </div>

                  </label>

                )}

              </div>


              <div className="checkout-summary-spacer" />


              <button
                type="button"
                className="checkout-pay-now-button"
                onClick={() =>
                  setIsPaymentOpen(
                    true,
                  )
                }
                disabled={
                  !hasItems
                }
              >
                Pay Now
              </button>


              <button
                type="button"
                className="checkout-cancel-button"
                disabled={
                  !hasItems
                }
                onClick={

                  cancelSale
                }
              >
                Cancel Sale
              </button>
            </>

          )}


          {isPaymentOpen && (

            <>
              <div className="checkout-summary-payment-note">
                Payment in progress
              </div>

              <div className="checkout-summary-spacer" />

              <button
                type="button"
                className="checkout-back-cart-summary"
                onClick={() =>
                  setIsPaymentOpen(
                    false,
                  )
                }
              >
                ← Back to Cart
              </button>
            </>

          )}

        </aside>

      </main>


      {isPaymentOpen && (

        <div
          className="checkout-payment-modal-backdrop"
        >

<section className="checkout-payment-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-payment-modal-title">

            <div className="checkout-payment-modal-header">

              <div>
                <h2 id="checkout-payment-modal-title">
                  Payment
                </h2>

                <p>
                  Choose a payment method and complete this sale.
                </p>
              </div>


              <button
                type="button"
                className="checkout-payment-modal-close"
                onClick={() =>
                  setIsPaymentOpen(
                    false,
                  )
                }
                aria-label="Close payment"
              >
                ×
              </button>

            </div>


            <div className="checkout-payment-modal-body">

              <div className="checkout-payment-card">

<div className="checkout-payment-layout checkout-payment-layout-simple">

  <div className="checkout-payment-right checkout-payment-right-full">

    <span className="checkout-payment-label">
      Payment Method
    </span>


    <div className="checkout-payment-methods checkout-payment-methods-three">

      {/* CASH */}

      <button
        type="button"
        className={
          paymentMethod ===
          "CASH"
            ? "active"
            : ""
        }
        onClick={() => {
          setPaymentMethod(
            "CASH",
          );

          resetMpesaPayment();
        }}
        disabled={
          !hasItems
        }
      >
        <CircleDollarSign
          size={18}
        />

        Cash
      </button>


      {/* M-PESA */}

      <button
        type="button"
        className={
          paymentMethod ===
          "MPESA"
            ? "active"
            : ""
        }
        onClick={() => {
          setPaymentMethod(
            "MPESA",
          );

          setCashReceived(
            "",
          );

          resetMpesaPayment();
        }}
        disabled={
          !hasItems
        }
      >
        M-Pesa
      </button>


      {/* SPLIT */}

      <button
        type="button"
        className={
          paymentMethod ===
          "SPLIT"
            ? "active"
            : ""
        }
        onClick={() => {
          setPaymentMethod(
            "SPLIT",
          );

          setCashReceived(
            "",
          );

          resetMpesaPayment();
        }}
        disabled={
          !hasItems
        }
      >
        Split
      </button>

    </div>


    {/* CASH RECEIVED BELOW PAYMENT METHOD */}

    {paymentMethod ===
    "CASH" && (

      <label className="checkout-cash-compact checkout-cash-below-method">

        <span>
          Cash Received
        </span>

        <div className="checkout-cash-compact-value">

          <span>
            Ksh
          </span>

          <input
            type="number"
            min="0"
            max="9999"
            step="0.01"
            value={
              cashReceived
            }
            onChange={(
              event,
            ) => {
              const value =
                event.target.value;

              if (
                value === "" ||
                Number(value) <=
                  9999
              ) {
                setCashReceived(
                  value,
                );
              }
            }}
            placeholder="0.00"
            disabled={
              !hasItems
            }
          />

        </div>

      </label>

    )}


    {/* CASH HELP */}

    {paymentMethod ===
    "CASH" && (

      <div className="checkout-cash-help">

        <CircleDollarSign
          size={18}
        />

        <span>
          Enter the cash amount
          received from the customer.
        </span>

      </div>

    )}

  </div>

</div>


{/* ==================================
    QUICK CASH — ONE ROW
================================== */}

{paymentMethod ===
  "CASH" &&
  hasItems && (

  <div className="checkout-quick-cash-one-row">

    <button
      type="button"
      onClick={
        setExactCash
      }
    >
      Exact{" "}
      {formatMoney(
        totalCents,
      )}
    </button>


    {quickCashOptions.map(
      (amount) => (

        <button
          type="button"
          key={
            amount
          }
          onClick={() =>
            setQuickCash(
              amount,
            )
          }
        >
          {formatMoney(
            amount * 100,
          )}
        </button>

      ),
    )}

  </div>

)}


{/* ==================================
    CASH BALANCE
================================== */}

{paymentMethod ===
"CASH" && (

  <div
    className={`checkout-balance-card checkout-balance-wide ${
      changeDueCents >
      0
        ? "change"
        : "remaining"
    }`}
  >

    <span>
      {changeDueCents >
      0
        ? "Change Due"
        : "Amount Remaining"}
    </span>

    <strong>
      {formatMoney(
        changeDueCents >
        0
          ? changeDueCents
          : amountRemainingCents,
      )}
    </strong>

  </div>

)}


{/* ==================================
    M-PESA
================================== */}

{paymentMethod ===
"MPESA" && (

  <div className="checkout-payment-section">

    <label className="checkout-payment-field">

      <span>
        Customer Phone
      </span>

      <div>

        <span>
          +254
        </span>

        <input
          type="tel"
          value={
            mpesaPhoneNumber
          }
          onChange={(
            event,
          ) =>
            setMpesaPhoneNumber(
              event.target.value,
            )
          }
          placeholder="07XXXXXXXX"
          disabled={
            !hasItems ||
            isSendingMpesaPush ||
            isCheckingMpesaPayment ||
            mpesaPaymentStatus ===
              "WAITING" ||
            mpesaPaymentStatus ===
              "PAID"
          }
        />

      </div>

    </label>


    <label className="checkout-payment-field">

      <span>
        M-Pesa Amount
      </span>

      <div>

        <span>
          Ksh
        </span>

        <input
          type="text"
          value={
            (
              totalCents /
              100
            ).toFixed(2)
          }
          readOnly
          disabled={
            !hasItems
          }
        />

      </div>

    </label>


    <button
      type="button"
      className="checkout-split-exact-button"
      onClick={
        sendMpesaPush
      }
      disabled={
        !hasItems ||
        !mpesaPhoneNumber.trim() ||
        isSendingMpesaPush ||
        isCheckingMpesaPayment ||
        mpesaPaymentStatus ===
          "WAITING" ||
        mpesaPaymentStatus ===
          "PAID"
      }
    >
      {isSendingMpesaPush
        ? "Sending M-Pesa Push..."
        : mpesaPaymentStatus ===
            "FAILED"
          ? "Retry M-Pesa Push"
          : "Send M-Pesa Push"}
    </button>


    {mpesaCheckoutRequestId &&
      mpesaPaymentStatus !==
        "PAID" && (

      <button
        type="button"
        className="checkout-split-exact-button"
        onClick={
          checkMpesaPayment
        }
        disabled={
          isCheckingMpesaPayment ||
          isSendingMpesaPush
        }
      >
        {isCheckingMpesaPayment
          ? "Checking Payment..."
          : "Check M-Pesa Payment"}
      </button>

    )}


    <MpesaPaymentStatus
      paymentStatus={
        mpesaPaymentStatus
      }
      statusMessage={
        mpesaStatusMessage
      }
      phoneNumber={
        mpesaPhoneNumber
      }
      checkoutRequestId={
        mpesaCheckoutRequestId
      }
      mpesaReceivedCents={
        mpesaPaymentStatus ===
        "PAID"
          ? mpesaReceivedCents
          : 0
      }
      amountRemainingCents={
        mpesaPaymentStatus ===
        "PAID"
          ? amountRemainingCents
          : totalCents
      }
    />

  </div>

)}


{/* ==================================
    SPLIT PAYMENT
================================== */}

{paymentMethod ===
"SPLIT" && (

  <div className="checkout-payment-section">

    <label className="checkout-payment-field">

      <span>
        Customer Phone
      </span>

      <div>

        <span>
          +254
        </span>

        <input
          type="tel"
          value={
            mpesaPhoneNumber
          }
          onChange={(
            event,
          ) =>
            setMpesaPhoneNumber(
              event.target.value,
            )
          }
          placeholder="07XXXXXXXX"
          disabled={
            !hasItems ||
            isSendingMpesaPush ||
            isCheckingMpesaPayment ||
            mpesaPaymentStatus ===
              "WAITING" ||
            mpesaPaymentStatus ===
              "PAID"
          }
        />

      </div>

    </label>


    <div className="checkout-split-payment">

      <label className="checkout-payment-field">

        <span>
          M-Pesa Amount
        </span>

        <div>

          <span>
            Ksh
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            max={
              (
                Math.max(
                  totalCents - 1,
                  0,
                ) /
                100
              ).toFixed(2)
            }
            value={
              mpesaReceived
            }
            onChange={(
              event,
            ) => {
              setMpesaReceived(
                event.target.value,
              );

              if (
                mpesaPaymentStatus !==
                "IDLE"
              ) {
                setMpesaCheckoutRequestId(
                  null,
                );

                setMpesaPaymentStatus(
                  "IDLE",
                );

                setMpesaStatusMessage("");
              }
            }}
            placeholder="0.00"
            disabled={
              !hasItems ||
              isSendingMpesaPush ||
              isCheckingMpesaPayment ||
              mpesaPaymentStatus ===
                "WAITING" ||
              mpesaPaymentStatus ===
                "PAID"
            }
          />

        </div>

      </label>


      <label className="checkout-payment-field">

        <span>
          Cash Amount
        </span>

        <div>

          <CircleDollarSign
            size={19}
          />

          <input
            type="number"
            min="0"
            max="9999"
            readOnly="readOnly"
            step="0.01"
            value={
              cashReceived
            }
            onChange={(
              event,
            ) => {
              const value =
                event.target.value;

              if (
                value === "" ||
                Number(value) <=
                  9999
              ) {
                setCashReceived(
                  value,
                );
              }
            }}
            placeholder="0.00"
            disabled={
              !hasItems
            }
          />

        </div>

      </label>

    </div>


    <button
      type="button"
      className="checkout-split-exact-button"
      onClick={
        setExactCash
      }
      disabled={
        !hasItems ||
        mpesaReceivedCents <=
          0
      }
    >
      Fill Remaining with Cash
    </button>


    <button
      type="button"
      className="checkout-split-exact-button"
      onClick={
        sendMpesaPush
      }
      disabled={
        !hasItems ||
        !mpesaPhoneNumber.trim() ||
        mpesaReceivedCents <=
          0 ||
        mpesaReceivedCents >=
          totalCents ||
        isSendingMpesaPush ||
        isCheckingMpesaPayment ||
        mpesaPaymentStatus ===
          "WAITING" ||
        mpesaPaymentStatus ===
          "PAID"
      }
    >
      {isSendingMpesaPush
        ? "Sending M-Pesa Push..."
        : mpesaPaymentStatus ===
            "FAILED"
          ? "Retry M-Pesa Push"
          : "Send M-Pesa Push"}
    </button>


    {mpesaCheckoutRequestId &&
      mpesaPaymentStatus !==
        "PAID" && (

      <button
        type="button"
        className="checkout-split-exact-button"
        onClick={
          checkMpesaPayment
        }
        disabled={
          isCheckingMpesaPayment ||
          isSendingMpesaPush
        }
      >
        {isCheckingMpesaPayment
          ? "Checking Payment..."
          : "Check M-Pesa Payment"}
      </button>

    )}


    <MpesaPaymentStatus
      paymentStatus={
        mpesaPaymentStatus
      }
      statusMessage={
        mpesaStatusMessage
      }
      phoneNumber={
        mpesaPhoneNumber
      }
      checkoutRequestId={
        mpesaCheckoutRequestId
      }
      mpesaReceivedCents={
        isMpesaPaymentConfirmed
          ? mpesaReceivedCents
          : 0
      }
      amountRemainingCents={
        amountRemainingCents
      }
    />


    <div className="checkout-payment-progress">

      <div>

        <span>
          Confirmed Paid
        </span>

        <strong>
          {formatMoney(
            totalPaidCents,
          )}
        </strong>

      </div>


      <div>

        <span>
          {changeDueCents >
          0
            ? "Change Due"
            : "Remaining"}
        </span>

        <strong>
          {formatMoney(
            changeDueCents >
            0
              ? changeDueCents
              : amountRemainingCents,
          )}
        </strong>

      </div>

    </div>

  </div>

)}

          

                <div className="checkout-payment-actions">

                  <button
                    type="button"
                    className="checkout-complete-button checkout-complete-button-payment"
                    disabled={
                      !canCompleteSale
                    }
                    onClick={
                      completeSale
                    }
                  >
                    {isCompletingSale
                      ? "Completing Sale..."
                      : `Complete Sale ${hasItems
                          ? formatMoney(
                              totalCents,
                            )
                          : ""}`}
                  </button>
 

                  <button
                    type="button"
                    className="checkout-cancel-button checkout-cancel-button-payment"
                    disabled={
                      !hasItems ||
                      isCompletingSale
                    }
                    onClick={
                      cancelSale
                    }
                  >
                    Cancel Sale
                  </button>

                </div>

              </div>

            </div>

          </section>

        </div>

      )}


      {/* ====================================
          HELD SALES DISPLAY
      ==================================== */}

      {!hasItems && isHeldSalesOpen && (
        <section className="held-sales-display">

          <div className="held-sales-display-header">

            <div>
              <h2>
                Held Sales
              </h2>

              <p>
                Select a transaction to continue checkout.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsHeldSalesOpen(
                  false,
                )
              }
            >
              Back to Scan
            </button>

          </div>


          {heldSales.length === 0 ? (

            <div className="held-sales-display-empty">
              No held sales.
            </div>

          ) : (

            <div className="held-sales-display-list">

              {heldSales.map(
                (sale) => (

                  <div
                    key={
                      sale.id
                    }
                    className="held-sale-display-row"
                  >

                    <div className="held-sale-display-info">

                      <strong>
                        {sale.label ||
                          "Held Sale"}
                      </strong>

                      <span>
                        {sale.itemCount}{" "}
                        {sale.itemCount === 1
                          ? "item"
                          : "items"}
                      </span>

                      <small>
                        {sale.heldAt
                          ? new Date(
                              sale.heldAt,
                            ).toLocaleString()
                          : ""}
                      </small>

                    </div>


                    <strong className="held-sale-display-total">
                      {formatMoney(
                        sale.subtotalCents,
                      )}
                    </strong>


                    <div className="held-sale-display-actions">

                      <button
                        type="button"
                        className="held-sale-resume-button"
                        onClick={() =>
                          resumeHeldSale(
                            sale.id,
                          )
                        }
                      >
                        Resume Sale
                      </button>

                      <button
                        type="button"
                        className="held-sale-remove-button"
                        onClick={() =>
                          cancelHeldSale(
                            sale.id,
                          )
                        }
                      >
                        Remove
                      </button>

                    </div>

                  </div>

                ),
              )}

            </div>

          )}

        </section>
      )}


      {/* ====================================
          PRODUCT LOOKUP
      ==================================== */}

     <ProductLookupModal
  isOpen={
    isProductLookupOpen
  }
  products={
    lookupProducts
  }
  onClose={
    closeProductLookup
  }
  onSelectProduct={
    handleLookupProductSelected
  }
/>


<ReceiptModal
  isOpen={
    isReceiptModalOpen
  }
  sale={
    completedReceiptSale
  }
  autoPrint={
    autoPrintReceipt
  }
  onClose={
    closeReceiptModal
  }
  onNoReceipt={
    closeReceiptModal
  }
  onPrinted={
    handleReceiptPrinted
  }
/>


<ReceiptPrinterSettingsModal
  isOpen={
    isPrinterSettingsOpen
  }
  onClose={() =>
    setIsPrinterSettingsOpen(
      false,
    )
  }
/>



</div>
);
}

export default Checkout;