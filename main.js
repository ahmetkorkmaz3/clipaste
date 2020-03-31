const {
  app,
  BrowserWindow,
  screen,
  globalShortcut,
  clipboard
} = require("electron");
const path = require("path");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync(path.join(app.getPath("home"), "/.clipaste.json"));
const db = low(adapter);

db.defaults({ clipboard: [] }).write();

function createWindow() {
  let appShow = false;

  const copyShortcut = process.platform === "darwin" ? "Option+C" : "Alt+C";
  const pasteShortcut = process.platform === "darwin" ? "Option+V" : "Alt+V";

  const mainWindow = new BrowserWindow({
    frame: false,
    width: 400,
    height: screen.getPrimaryDisplay().workAreaSize.height,
    x: screen.getPrimaryDisplay().workAreaSize.width - 400,
    y: 0,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    },
    show: false
  });

  mainWindow.loadFile("index.html");

  globalShortcut.register("CmdOrCtrl+Shift+0", () => {
    if (!appShow) {
      appShow = true;
      mainWindow.show();
    } else {
      appShow = false;
      mainWindow.hide();
    }
  });

  /*
  globalShortcut.register(copyShortcut, () => {
    let as = clipboard.read();
    console.log(as);
  });
   */
}

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", function() {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function() {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
