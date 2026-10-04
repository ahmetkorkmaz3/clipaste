const { contextBridge, ipcRenderer } = require("electron");

// The renderer gets only these functions. It has no Node.js access.
contextBridge.exposeInMainWorld("clipaste", {
  platform: process.platform,
  list: () => ipcRenderer.invoke("history:list"),
  copy: (id) => ipcRenderer.invoke("history:copy", id),
  remove: (id) => ipcRenderer.invoke("history:remove", id),
  togglePin: (id) => ipcRenderer.invoke("history:pin", id),
  clear: () => ipcRenderer.invoke("history:clear"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  hide: () => ipcRenderer.invoke("window:hide"),
  quit: () => ipcRenderer.invoke("app:quit"),
  openUrl: (url) => ipcRenderer.invoke("app:open-url", url),
  onHistoryChanged: (callback) => ipcRenderer.on("history:changed", (_event, items) => callback(items)),
  onShown: (callback) => ipcRenderer.on("window:shown", () => callback()),
});
