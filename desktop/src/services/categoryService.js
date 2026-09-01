export const categoryService = {
  async getAll() {
    if (typeof window.api?.getCategories !== "function") {
      throw new Error("The category API is unavailable.");
    }

    return window.api.getCategories();
  },
};