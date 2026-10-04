import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { History, migrateLegacy, normalizeItem } from "../src/main/history.js";

const clock = () => {
  let t = 1000;
  return () => t++;
};

describe("History", () => {
  it("adds new items to the top with source and time", () => {
    const history = new History([], { now: clock() });
    history.add("first", "Firefox");
    history.add("second", null);

    const [top, bottom] = history.list();
    assert.equal(top.text, "second");
    assert.equal(top.source, null);
    assert.equal(bottom.text, "first");
    assert.equal(bottom.source, "Firefox");
    assert.ok(top.copiedAt > bottom.copiedAt);
  });

  it("ignores empty and whitespace-only text", () => {
    const history = new History();
    assert.equal(history.add(""), null);
    assert.equal(history.add("   \n"), null);
    assert.equal(history.list().length, 0);
  });

  it("moves a duplicate to the top instead of adding a second copy", () => {
    const history = new History([], { now: clock() });
    const first = history.add("same", "Terminal");
    history.add("other");
    const again = history.add("same", "Code");

    assert.equal(history.list().length, 2);
    assert.equal(again.id, first.id);
    assert.equal(history.list()[0].text, "same");
    assert.equal(history.list()[0].source, "Code");
  });

  it("keeps the old source when a duplicate has no source", () => {
    const history = new History();
    history.add("same", "Terminal");
    history.add("same", null);
    assert.equal(history.list()[0].source, "Terminal");
  });

  it("touch moves an item to the top", () => {
    const history = new History([], { now: clock() });
    const a = history.add("a");
    history.add("b");
    history.touch(a.id);
    assert.deepEqual(
      history.list().map((i) => i.text),
      ["a", "b"],
    );
    assert.equal(history.touch("missing"), null);
  });

  it("trims to the limit but never removes pinned items", () => {
    const history = new History([], { limit: 2 });
    const pinned = history.add("pinned");
    history.togglePin(pinned.id);
    history.add("1");
    history.add("2");
    history.add("3");

    assert.deepEqual(
      history.list().map((i) => i.text),
      ["3", "2", "pinned"],
    );
  });

  it("setLimit trims the existing items", () => {
    const history = new History();
    ["a", "b", "c", "d"].forEach((t) => history.add(t));
    history.setLimit(2);
    assert.deepEqual(
      history.list().map((i) => i.text),
      ["d", "c"],
    );
  });

  it("clear keeps pinned items", () => {
    const history = new History();
    const keep = history.add("keep");
    history.add("drop");
    history.togglePin(keep.id);
    history.clear();
    assert.deepEqual(
      history.list().map((i) => i.text),
      ["keep"],
    );
  });

  it("remove deletes one item and reports the result", () => {
    const history = new History();
    const item = history.add("x");
    assert.equal(history.remove(item.id), true);
    assert.equal(history.remove(item.id), false);
    assert.equal(history.list().length, 0);
  });
});

describe("normalizeItem", () => {
  it("drops invalid entries", () => {
    assert.equal(normalizeItem(null), null);
    assert.equal(normalizeItem({ id: "a" }), null);
    assert.equal(normalizeItem({ text: " " }), null);
  });

  it("fills missing fields", () => {
    const item = normalizeItem({ text: "hello" });
    assert.equal(typeof item.id, "string");
    assert.equal(item.source, null);
    assert.equal(item.copiedAt, null);
    assert.equal(item.pinned, false);
  });
});

describe("migrateLegacy", () => {
  it("converts the 1.x format to newest first and removes duplicates", () => {
    const items = migrateLegacy({
      clipboard: [
        { id: "1", text: "old" },
        { id: "2", text: "dup" },
        { id: "3", text: "new" },
        { id: "4", text: "dup" },
        { id: "5", text: "" },
      ],
    });
    assert.deepEqual(
      items.map((i) => [i.id, i.text]),
      [
        ["4", "dup"],
        ["3", "new"],
        ["1", "old"],
      ],
    );
  });

  it("returns an empty list for unknown data", () => {
    assert.deepEqual(migrateLegacy(null), []);
    assert.deepEqual(migrateLegacy({}), []);
  });
});
