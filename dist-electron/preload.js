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
electron.contextBridge.exposeInMainWorld("satellite", {
  uploadExcel: (name, buffer) => electron.ipcRenderer.invoke("satellite:uploadExcel", { name, buffer }),
  getSatelliteData: (timeRange, satellite, page = 1, pageSize = 10) => electron.ipcRenderer.invoke("db:getSatelliteData", timeRange, satellite, page, pageSize),
  getAllSatelliteNames: () => electron.ipcRenderer.invoke("db:getAllSatelliteNames"),
  clearAllTables: () => electron.ipcRenderer.invoke("db:clearAllTables"),
  calculateRelativeState: (params) => electron.ipcRenderer.invoke("satellite:calculateRelativeState", params),
  getMeasurementMatrices: () => electron.ipcRenderer.invoke("db:getMeasurementMatrices"),
  upsertMeasurementMatrix: (data) => electron.ipcRenderer.invoke("db:upsertMeasurementMatrix", data),
  deleteMeasurementMatrix: (name) => electron.ipcRenderer.invoke("db:deleteMeasurementMatrix", name)
});
