import Database from "better-sqlite3";
import { app } from "electron";
import path from "node:path";
import fs from "node:fs";
import { createDatabaseSchema } from "./schema.js";
import { seedDatabase } from "./seed.js";

let database = null;


/* ==========================================
   DATABASE LOCATION
========================================== */

/**
 * Development:
 *   C:\Projects\hybrid-pos\desktop\data\hybrid-pos-dev.db
 *
 * Installed application:
 *   C:\Users\<USER>\AppData\Roaming\HybridPOS\data\hybrid-pos.db
 */
function getDatabasePath() {
  if (app.isPackaged) {
    const dataDirectory =
      path.join(
        app.getPath("userData"),
        "data",
      );

    fs.mkdirSync(
      dataDirectory,
      {
        recursive: true,
      },
    );

    return path.join(
      dataDirectory,
      "hybrid-pos.db",
    );
  }


  const developmentDataDirectory =
    path.join(
      process.cwd(),
      "data",
    );

  fs.mkdirSync(
    developmentDataDirectory,
    {
      recursive: true,
    },
  );

  return path.join(
    developmentDataDirectory,
    "hybrid-pos-dev.db",
  );
}


/* ==========================================
   INITIALIZE DATABASE
========================================== */

/**
 * Opens the local SQLite database.
 */
export function initializeDatabase() {
  if (database) {
    return database;
  }

  const databasePath =
    getDatabasePath();


  database =
    new Database(
      databasePath,
    );


  database.pragma(
    "foreign_keys = ON",
  );

  database.pragma(
    "journal_mode = WAL",
  );

  database.pragma(
    "busy_timeout = 5000",
  );


  createDatabaseSchema(
    database,
  );

  seedDatabase(
    database,
  );


  console.log(
    "SQLite database opened successfully.",
  );

  console.log(
    `Environment: ${
      app.isPackaged
        ? "PRODUCTION"
        : "DEVELOPMENT"
    }`,
  );

  console.log(
    `Database location: ${databasePath}`,
  );


  return database;
}


/* ==========================================
   GET DATABASE
========================================== */

/**
 * Returns the active database connection.
 */
export function getDatabase() {
  if (!database) {
    throw new Error(
      "Database has not been initialized. Call initializeDatabase() first.",
    );
  }

  return database;
}


/* ==========================================
   CLOSE DATABASE
========================================== */

/**
 * Closes the database safely when Electron exits.
 */
export function closeDatabase() {
  if (!database) {
    return;
  }

  database.close();

  database = null;

  console.log(
    "SQLite database closed successfully.",
  );
}