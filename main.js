const {
  app,
  BrowserWindow,
  screen,
  globalShortcut,
  clipboard,
  ipcMain
} = require("electron");
const path = require("path");
const low = require("lowdb");
const shortid = require('shortid');
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync(path.join(app.getPath("home"), "/.clipaste.json"));
const db = low(adapter);

db.defaults({ clipboard: [] }).write();

function createWindow() {
  let appShow = false;

  const mainWindow = new BrowserWindow({
    frame: false,
    width: 400,
    height: screen.getPrimaryDisplay().workAreaSize.height,
    x: screen.getPrimaryDisplay().workAreaSize.width - 400,
    y: 0,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true
    },
    show: false
  });

  mainWindow.loadFile("index.html");
  mainWindow.webContents.openDevTools();

  globalShortcut.register("CmdOrCtrl+Shift+0", () => {
    if (!appShow) {
      appShow = true;
      mainWindow.show();
    } else {
      appShow = false;
      mainWindow.hide();
    }
  });

  startMonitoringClipboard();

  function startMonitoringClipboard() {
    mainWindow.webContents.send("app-running");
    let previousText = clipboard.readText();

    const isDiffText = (str1, str2) => {
      return str2 && str1 !== str2;
    };

    setInterval(() => {
      if (isDiffText(previousText, (previousText = clipboard.readText()))) {
        writeTextClipboard(clipboard.readText());
        updateClipboardList();
      }
    }, 500);
  }

  function writeTextClipboard(text) {
    db.get("clipboard")
      .push({ id: shortid.generate(), text: text })
      .write();
  }

  function updateClipboardList() {
    mainWindow.webContents.send("update-clipboard");
  }
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
