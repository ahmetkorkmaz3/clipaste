import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import x11 from "x11";
import { createServer } from "x11/lib/xserver/index.js";
import { closeX11, getSourceApp } from "../src/main/source-app.js";

// Runs the Linux lookup against the pure JavaScript X server that comes with
// the x11 package. A second client acts as the window manager and the app.
const DISPLAY_NUM = 87;

function connect() {
  return new Promise((resolve, reject) => {
    x11.createClient({ display: `127.0.0.1:${DISPLAY_NUM}` }, (error, display) => (error ? reject(error) : resolve(display)));
  });
}

const call = (fn) => new Promise((resolve, reject) => fn((error, value) => (error ? reject(error) : resolve(value))));

describe("getSourceApp on Linux (X11)", () => {
  let server;
  let wm;
  let root;
  let activeAtom;
  const originalDisplay = process.env.DISPLAY;

  before(async () => {
    server = createServer();
    await new Promise((resolve) => server.listen(DISPLAY_NUM, resolve));
    process.env.DISPLAY = `127.0.0.1:${DISPLAY_NUM}`;

    const display = await connect();
    wm = display.client;
    root = display.screen[0].root;
    activeAtom = await call((cb) => wm.InternAtom(false, "_NET_ACTIVE_WINDOW", cb));
  });

  after(async () => {
    await closeX11();
    wm.terminate();
    server._netServer.close();
    if (originalDisplay === undefined) delete process.env.DISPLAY;
    else process.env.DISPLAY = originalDisplay;
  });

  const setActive = async (window) => {
    const data = Buffer.alloc(4);
    data.writeUInt32LE(window);
    wm.ChangeProperty(0, root, activeAtom, wm.atoms.WINDOW, 32, data);
    await wm.sync();
  };

  it("returns the WM_CLASS of the active window", async () => {
    const window = wm.AllocID();
    wm.CreateWindow(window, root, 0, 0, 10, 10, 0, 0, 0, 0, {});
    wm.ChangeProperty(0, window, wm.atoms.WM_CLASS, wm.atoms.STRING, 8, "Navigator\0google-chrome\0");
    await setActive(window);

    assert.equal(await getSourceApp("linux"), "Google Chrome");
  });

  it("returns null when no window has focus", async () => {
    await setActive(0);
    assert.equal(await getSourceApp("linux"), null);
  });
});
