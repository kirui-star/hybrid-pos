function requireInventoryApi(methodName) {
  const method = window.api?.[methodName];

  if (typeof method !== "function") {
    throw new Error(
      `The inventory API method "${methodName}" is unavailable.`,
    );
  }

  return method;
}

export const inventoryService = {
  async adjust(adjustment) {
    const adjustInventory =
      requireInventoryApi(
        "adjustInventory",
      );

    return adjustInventory(
      adjustment,
    );
  },
};