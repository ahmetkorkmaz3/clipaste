import { randomUUID } from "node:crypto";

export const DEFAULT_LIMIT = 200;

/**
 * Pure clipboard history logic. Items are kept newest first.
 * Pinned items are never trimmed by the limit and survive "clear".
 */
export class History {
  constructor(items = [], { limit = DEFAULT_LIMIT, now = () => Date.now() } = {}) {
    this.items = items.map(normalizeItem).filter(Boolean);
    this.limit = limit;
    this.now = now;
  }

  list() {
    return this.items;
  }

  /** Adds text to the top. A duplicate moves to the top instead of a second copy. */
  add(text, source = null) {
    if (typeof text !== "string" || text.trim() === "") return null;

    const existing = this.items.find((item) => item.text === text);
    if (existing) {
      this.items = [existing, ...this.items.filter((item) => item !== existing)];
      existing.copiedAt = this.now();
      if (source) existing.source = source;
      return existing;
    }

    const item = { id: randomUUID(), text, source, copiedAt: this.now(), pinned: false };
    this.items.unshift(item);
    this.trim();
    return item;
  }

  /** Moves an item to the top, for example after the user copies it again. */
  touch(id) {
    const item = this.get(id);
    if (!item) return null;
    this.items = [item, ...this.items.filter((i) => i !== item)];
    item.copiedAt = this.now();
    return item;
  }

  get(id) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  remove(id) {
    const before = this.items.length;
    this.items = this.items.filter((item) => item.id !== id);
    return this.items.length !== before;
  }

  togglePin(id) {
    const item = this.get(id);
    if (!item) return null;
    item.pinned = !item.pinned;
    return item;
  }

  /** Removes all items that are not pinned. */
  clear() {
    this.items = this.items.filter((item) => item.pinned);
  }

  setLimit(limit) {
    this.limit = limit;
    this.trim();
  }

  trim() {
    let unpinned = 0;
    this.items = this.items.filter((item) => item.pinned || ++unpinned <= this.limit);
  }
}

/**
 * Converts an item from any earlier format to the current shape.
 * Version 1.x stored { id, text } in insertion order (oldest first).
 */
export function normalizeItem(raw) {
  if (!raw || typeof raw.text !== "string" || raw.text.trim() === "") return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : randomUUID(),
    text: raw.text,
    source: typeof raw.source === "string" ? raw.source : null,
    copiedAt: Number.isFinite(raw.copiedAt) ? raw.copiedAt : null,
    pinned: raw.pinned === true,
  };
}

/** Converts the version 1.x database ({ clipboard: [...] }, oldest first) to items, newest first. */
export function migrateLegacy(data) {
  if (!data || !Array.isArray(data.clipboard)) return [];
  const seen = new Set();
  return [...data.clipboard]
    .reverse()
    .map(normalizeItem)
    .filter((item) => item && !seen.has(item.text) && seen.add(item.text));
}
