import { getDatabase } from "../database/database.js";

const STORE_ID = "store-001";

export function registerCategoryHandlers(ipcMain) {
  ipcMain.handle("categories:getAll", () => {
    const database = getDatabase();

    return database
      .prepare(`
        SELECT
          id,
          name,
          description,
          is_active
        FROM categories
        WHERE store_id = ?
          AND is_active = 1
        ORDER BY name
      `)
      .all(STORE_ID);
  });
}