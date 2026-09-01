function requireSaleApi(methodName) {
  const method =
    window.api?.[methodName];

  if (
    typeof method !== "function"
  ) {
    throw new Error(
      `The sale API method "${methodName}" is unavailable.`,
    );
  }

  return method;
}


function validateSalePayload(sale) {
  if (!sale) {
    throw new Error(
      "Sale data is required.",
    );
  }

  if (
    !Array.isArray(
      sale.items,
    ) ||
    sale.items.length === 0
  ) {
    throw new Error(
      "The sale must contain at least one item.",
    );
  }

  if (
    !Number.isInteger(
      sale.subtotalCents,
    ) ||
    sale.subtotalCents < 0
  ) {
    throw new Error(
      "Sale subtotal is invalid.",
    );
  }

  if (
    !Number.isInteger(
      sale.discountCents,
    ) ||
    sale.discountCents < 0
  ) {
    throw new Error(
      "Sale discount is invalid.",
    );
  }

  if (
    sale.discountCents >
    sale.subtotalCents
  ) {
    throw new Error(
      "Sale discount cannot exceed the subtotal.",
    );
  }

  if (
    !Number.isInteger(
      sale.taxCents,
    ) ||
    sale.taxCents < 0
  ) {
    throw new Error(
      "Sale tax is invalid.",
    );
  }

  if (
    !Number.isInteger(
      sale.totalCents,
    ) ||
    sale.totalCents < 0
  ) {
    throw new Error(
      "Sale total is invalid.",
    );
  }

  const validPaymentMethods = [
    "CASH",
    "MPESA",
    "SPLIT",
  ];

  if (
    !validPaymentMethods.includes(
      sale.paymentMethod,
    )
  ) {
    throw new Error(
      "A valid payment method is required.",
    );
  }
}


export const saleService = {
  async complete(sale) {
    validateSalePayload(sale);

    const completeSale =
      requireSaleApi(
        "completeSale",
      );

    return completeSale(
      sale,
    );
  },
};