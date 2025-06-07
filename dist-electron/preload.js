"use strict";
const electron = require("electron");
const WINDOW_CONTROL_CHANNELS = {
  MINIMIZE: "window:minimize",
  MAXIMIZE: "window:maximize",
  CLOSE: "window:close"
};
electron.contextBridge.exposeInMainWorld("windowControl", {
  minimize: () => electron.ipcRenderer.send(WINDOW_CONTROL_CHANNELS.MINIMIZE),
  maximize: () => electron.ipcRenderer.send(WINDOW_CONTROL_CHANNELS.MAXIMIZE),
  close: () => electron.ipcRenderer.send(WINDOW_CONTROL_CHANNELS.CLOSE)
});
