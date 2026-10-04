import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, nativeImage, screen, shell, Tray } from "electron";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isAutostartEnabled, setAutostart } from "./autostart.js";
import { History } from "./history.js";
import { getSourceApp } from "./source-app.js";
import { openStorage } from "./storage.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHORTCUT = "CmdOrCtrl+Shift+9";
const WINDOW_WIDTH = 420;
const POLL_MS = 500;
const REPO_URL = "https://github.com/ahmetkorkmaz3/clipaste";
const LIMITS = [50, 100, 200, 500, 1000];

// Password managers mark secrets with these formats. Clipaste does not store them.
const CONCEALED_FORMATS = ["x-kde-passwordManagerHint", "org.nspasteboard.ConcealedType", "ExcludeClipboardContentFromMonitorProcessing"];

// On Wayland, a window without focus cannot read the clipboard and global
// shortcuts do not work. XWayland keeps both features available. The switch
// must be on the command line before Chromium starts, so Clipaste starts again with it.
const needsX11Relaunch =
  process.platform === "linux" &&
  process.env.WAYLAND_DISPLAY &&
  process.env.DISPLAY &&
  !app.commandLine.hasSwitch("ozone-platform");

if (needsX11Relaunch) {
  app.relaunch({ args: [...process.argv.slice(1), "--ozone-platform=x11"] });
  app.exit(0);
} else if (!app.requestSingleInstanceLock()) {
  // A second start with --toggle (for example from a desktop keyboard shortcut)
  // goes to the running instance through the "second-instance" event.
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    if (argv.includes("--toggle")) toggleWindow();
    else showWindow();
  });
  app.whenReady().then(start);
}

let db;
let history;
let mainWindow;
let tray;
let lastText = "";

async function start() {
  if (process.platform === "darwin") app.dock?.hide();

  db = await openStorage(path.join(app.getPath("userData"), "history.json"), path.join(homedir(), ".clipaste.json"));
  history = new History(db.data.items, { limit: db.data.settings.limit });

  registerIpc();
  createWindow();
  createTray();

  if (!globalShortcut.register(SHORTCUT, toggleWindow)) {
    console.warn(`Could not register the global shortcut ${SHORTCUT}. Use "clipaste --toggle" instead.`);
  }

  lastText = await readClipboardText();
  setInterval(pollClipboard, POLL_MS);

  if (!process.argv.includes("--hidden")) showWindow();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: 600,
    frame: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    resizable: false,
    title: "Clipaste",
    icon: path.join(ROOT, "assets", "logo.png"),
    backgroundColor: "#f4f6fb",
    webPreferences: {
      preload: path.join(ROOT, "src", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(ROOT, "src", "renderer", "index.html"));

  // Links in clipboard items must open in the browser, never inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());

  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function placeWindow() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width, height } = display.workArea;
  mainWindow.setBounds({ x: x + width - WINDOW_WIDTH, y, width: WINDOW_WIDTH, height });
}

function showWindow() {
  placeWindow();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("window:shown");
}

function hideWindow() {
  mainWindow.hide();
  // On macOS, give the focus back to the app the user copied from.
  if (process.platform === "darwin") app.hide();
}

function toggleWindow() {
  if (mainWindow.isVisible() && mainWindow.isFocused()) hideWindow();
  else showWindow();
}

async function readClipboardText() {
  try {
    return await clipboard.readText();
  } catch {
    return "";
  }
}

async function isConcealed() {
  for (const format of CONCEALED_FORMATS) {
    try {
      if (await clipboard.has(`electron application/osclipboard;format="${format}"`)) return true;
    } catch {
      // The platform does not know this format.
    }
  }
  return false;
}

let polling = false;
async function pollClipboard() {
  // The clipboard API is asynchronous. Do not start a new poll while one runs.
  if (polling) return;
  polling = true;
  try {
    const text = await readClipboardText();
    if (!text || text === lastText) return;
    lastText = text;

    if (db.data.settings.paused || (await isConcealed())) return;

    const source = await getSourceApp();
    // When Clipaste itself has the focus, the real source is unknown.
    history.add(text, BrowserWindow.getFocusedWindow() ? null : source);
    await save();
  } catch (error) {
    console.error("Clipboard poll failed:", error);
  } finally {
    polling = false;
  }
}

async function copyItem(id) {
  const item = history.touch(id);
  if (!item) return null;
  lastText = item.text;
  await clipboard.writeText(item.text);
  await save();
  return item;
}

async function save() {
  db.data.items = history.list();
  await db.write();
  mainWindow?.webContents.send("history:changed", history.list());
  updateTray();
}

async function updateSettings(patch) {
  Object.assign(db.data.settings, patch);
  if (patch.limit) history.setLimit(patch.limit);
  await save();
}

function registerIpc() {
  ipcMain.handle("history:list", () => history.list());
  ipcMain.handle("settings:get", () => ({ ...db.data.settings, shortcut: SHORTCUT, version: app.getVersion() }));

  ipcMain.handle("history:copy", async (_event, id) => {
    if ((await copyItem(id)) && db.data.settings.hideAfterCopy) hideWindow();
  });

  ipcMain.handle("history:remove", async (_event, id) => {
    if (history.remove(id)) await save();
  });

  ipcMain.handle("history:pin", async (_event, id) => {
    if (history.togglePin(id)) await save();
  });

  ipcMain.handle("history:clear", async () => {
    history.clear();
    await save();
  });

  ipcMain.handle("window:hide", () => hideWindow());
  ipcMain.handle("app:quit", () => quit());
  ipcMain.handle("app:open-url", (_event, url) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(ROOT, "assets", "tray.png"));
  tray = new Tray(icon);
  tray.setToolTip("Clipaste");
  // Linux AppIndicator trays do not send click events. The menu has a "Show" item for them.
  tray.on("click", toggleWindow);
  updateTray();
}

function updateTray() {
  if (!tray) return;
  const settings = db.data.settings;
  const recent = history.list().slice(0, 5);

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show Clipaste", accelerator: SHORTCUT, click: showWindow },
      { type: "separator" },
      ...(recent.length ? [{ label: "Recent", enabled: false }] : []),
      ...recent.map((item) => ({
        label: truncate(item.text, 40),
        click: () => copyItem(item.id),
      })),
      ...(recent.length ? [{ type: "separator" }] : []),
      {
        label: "Pause Recording",
        type: "checkbox",
        checked: settings.paused,
        click: (menuItem) => updateSettings({ paused: menuItem.checked }),
      },
      {
        label: "Hide After Copy",
        type: "checkbox",
        checked: settings.hideAfterCopy,
        click: (menuItem) => updateSettings({ hideAfterCopy: menuItem.checked }),
      },
      {
        label: "Start at Login",
        type: "checkbox",
        checked: isAutostartEnabled(app),
        click: (menuItem) => {
          setAutostart(app, menuItem.checked);
          updateTray();
        },
      },
      {
        label: "History Size",
        submenu: LIMITS.map((limit) => ({
          label: `${limit} items`,
          type: "radio",
          checked: settings.limit === limit,
          click: () => updateSettings({ limit }),
        })),
      },
      { type: "separator" },
      { label: `About Clipaste ${app.getVersion()}`, click: () => shell.openExternal(REPO_URL) },
      { label: "Report a Problem", click: () => shell.openExternal(`${REPO_URL}/issues/new/choose`) },
      { type: "separator" },
      { label: "Quit", click: quit },
    ]),
  );
}

function truncate(text, max) {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

function quit() {
  app.isQuitting = true;
  app.quit();
}

// Cmd+Q, a system logout or a shutdown must close the window for real.
app.on("before-quit", () => {
  app.isQuitting = true;
});
app.on("will-quit", () => globalShortcut.unregisterAll());

// Clipaste lives in the tray. Closing the window does not quit the app.
app.on("window-all-closed", () => {});
