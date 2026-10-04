import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS, openStorage } from "../src/main/storage.js";

const tempDir = () => mkdtempSync(path.join(tmpdir(), "clipaste-test-"));

describe("openStorage", () => {
  it("creates a new database with default settings", async () => {
    const file = path.join(tempDir(), "history.json");
    const db = await openStorage(file);
    assert.deepEqual(db.data.items, []);
    assert.deepEqual(db.data.settings, DEFAULT_SETTINGS);
    assert.ok(existsSync(file));
  });

  it("imports the 1.x history one time and renames the old file", async () => {
    const dir = tempDir();
    const legacy = path.join(dir, ".clipaste.json");
    writeFileSync(legacy, JSON.stringify({ clipboard: [{ id: "a", text: "old" }, { id: "b", text: "new" }] }));

    const file = path.join(dir, "history.json");
    const db = await openStorage(file, legacy);

    assert.deepEqual(
      db.data.items.map((i) => i.text),
      ["new", "old"],
    );
    assert.equal(existsSync(legacy), false);
    assert.ok(existsSync(`${legacy}.migrated`));
    assert.equal(JSON.parse(readFileSync(file, "utf8")).items.length, 2);
  });

  it("does not import when the new database already exists", async () => {
    const dir = tempDir();
    const file = path.join(dir, "history.json");
    await openStorage(file);

    const legacy = path.join(dir, ".clipaste.json");
    writeFileSync(legacy, JSON.stringify({ clipboard: [{ id: "a", text: "old" }] }));
    const db = await openStorage(file, legacy);

    assert.deepEqual(db.data.items, []);
    assert.ok(existsSync(legacy));
  });

  it("keeps working when the old file is not valid JSON", async () => {
    const dir = tempDir();
    const legacy = path.join(dir, ".clipaste.json");
    writeFileSync(legacy, "{not json");
    const db = await openStorage(path.join(dir, "history.json"), legacy);
    assert.deepEqual(db.data.items, []);
  });

  it("adds new default settings to an old settings object", async () => {
    const file = path.join(tempDir(), "history.json");
    writeFileSync(file, JSON.stringify({ version: 2, items: [{ text: "x" }], settings: { limit: 50 } }));
    const db = await openStorage(file);
    assert.equal(db.data.settings.limit, 50);
    assert.equal(db.data.settings.hideAfterCopy, true);
    assert.equal(db.data.items[0].text, "x");
  });
});
