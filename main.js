const {app, BrowserWindow, screen} = require('electron')
const path = require('path')

function createWindow () {
  const mainWindow = new BrowserWindow({
    frame: false,
    width: 400,
    height: screen.getPrimaryDisplay().workAreaSize.height,
    x: (screen.getPrimaryDisplay().workAreaSize.width - 400),
    y: 0,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
