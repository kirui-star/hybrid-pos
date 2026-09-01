function requireProductApi(methodName) {
  const method = window.api?.[methodName];

  if (typeof method !== "function") {
    throw new Error(
      `The product API method "${methodName}" is unavailable.`,
    );
  }

  return method;
}

export const productService = {
  async getAll() {
    const getProducts =
      requireProductApi("getProducts");

    return getProducts();
  },

    async getByBarcode(barcode) {
    if (!barcode) {
      throw new Error("Barcode is required.");
    }

    const getProductByBarcode =
      requireProductApi(
        "getProductByBarcode",
      );

    return getProductByBarcode(barcode);
  },

  async create(product) {
    const createProduct =
      requireProductApi("createProduct");

    return createProduct(product);
  },

  async update(productId, product) {
    const updateProduct =
      requireProductApi("updateProduct");

    return updateProduct(productId, product);
  },



  async deactivate(productId) {
    const deactivateProduct =
      requireProductApi("deactivateProduct");

    return deactivateProduct(productId);
  },

  async activate(productId) {
  if (!productId) {
    throw new Error("Product ID is required.");
  }

  const activateProduct =
    requireProductApi("activateProduct");

  return activateProduct(productId);
},

};