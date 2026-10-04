import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseLsappinfoName, parseWmClass, prettifyAppName } from "../src/main/source-app.js";

describe("source app parsers", () => {
  it("reads the class name from WM_CLASS", () => {
    assert.equal(parseWmClass(Buffer.from("Navigator\0firefox\0")), "firefox");
    assert.equal(parseWmClass(Buffer.from("code\0Code\0")), "Code");
    assert.equal(parseWmClass(Buffer.alloc(0)), null);
  });

  it("reads the display name from lsappinfo", () => {
    assert.equal(parseLsappinfoName('"LSDisplayName"="IntelliJ IDEA"\n'), "IntelliJ IDEA");
    assert.equal(parseLsappinfoName(""), null);
  });

  it("makes window class names readable", () => {
    assert.equal(prettifyAppName("google-chrome"), "Google Chrome");
    assert.equal(prettifyAppName("gnome-terminal-server"), "Gnome Terminal Server");
    assert.equal(prettifyAppName("firefox"), "Firefox");
    assert.equal(prettifyAppName("notepad.exe"), "Notepad");
    assert.equal(prettifyAppName(""), null);
    assert.equal(prettifyAppName(null), null);
  });
});
