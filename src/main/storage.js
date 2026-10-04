import { existsSync, readFileSync, renameSync } from "node:fs";
import { JSONFilePreset } from "lowdb/node";
import { DEFAULT_LIMIT, migrateLegacy, normalizeItem } from "./history.js";

export const DEFAULT_SETTINGS = {
  limit: DEFAULT_LIMIT,
  paused: false,
  hideAfterCopy: true,
};

/**
 * Opens the database at `file`. On the first start, it imports the
 * version 1.x history from `legacyFile` and renames that file so that
 * the import runs only one time.
 */
export async function openStorage(file, legacyFile = null) {
  const isNew = !existsSync(file);
  const db = await JSONFilePreset(file, { version: 2, items: [], settings: { ...DEFAULT_SETTINGS } });

  db.data.items = (db.data.items ?? []).map(normalizeItem).filter(Boolean);
  db.data.settings = { ...DEFAULT_SETTINGS, ...db.data.settings };

  if (isNew && legacyFile && existsSync(legacyFile)) {
    try {
      db.data.items = migrateLegacy(JSON.parse(readFileSync(legacyFile, "utf8")));
      renameSync(legacyFile, `${legacyFile}.migrated`);
    } catch (error) {
      console.error("Could not import the old clipboard history:", error);
    }
  }

  await db.write();
  return db;
}
