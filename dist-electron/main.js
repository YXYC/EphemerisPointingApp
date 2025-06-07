"use strict";
const electron = require("electron");
const services_window_service = require("./services/window.service.js");
const services_database_service = require("./services/database.service.js");
const path = require("path");
function setupIpcHandlers() {
  const windowService = services_window_service.WindowService.getInstance();
  const dbService = services_database_service.DatabaseService.getInstance();
  electron.ipcMain.on("window:minimize", () => {
    windowService.minimizeWindow();
  });
  electron.ipcMain.on("window:maximize", () => {
    windowService.maximizeWindow();
  });
  electron.ipcMain.on("window:close", () => {
    windowService.closeWindow();
  });
  electron.ipcMain.handle("db:getSatelliteData", (_, timeRange, satellite) => {
    return dbService.getSatelliteData(timeRange, satellite);
  });
  electron.ipcMain.handle("db:upsertSatelliteData", (_, data) => {
    return dbService.upsertSatelliteData(data);
  });
  electron.ipcMain.handle("db:getEphemerisResults", (_, timeRange, sourceSatellite, targetSatellite) => {
    return dbService.getEphemerisResults(timeRange, sourceSatellite, targetSatellite);
  });
  electron.ipcMain.handle("db:upsertEphemerisResult", (_, data) => {
    return dbService.upsertEphemerisResult(data);
  });
  electron.ipcMain.handle("db:getMeasurementMatrices", () => {
    return dbService.getMeasurementMatrices();
  });
  electron.ipcMain.handle("db:upsertMeasurementMatrix", (_, data) => {
    return dbService.upsertMeasurementMatrix(data);
  });
  electron.ipcMain.handle("db:deleteSatelliteData", (_, time, satellite) => {
    return dbService.deleteSatelliteData(time, satellite);
  });
  electron.ipcMain.handle("db:deleteEphemerisResult", (_, time, sourceSatellite, targetSatellite) => {
    return dbService.deleteEphemerisResult(time, sourceSatellite, targetSatellite);
  });
  electron.ipcMain.handle("db:deleteMeasurementMatrix", (_, name) => {
    return dbService.deleteMeasurementMatrix(name);
  });
}
if (process.env.NODE_ENV === "development") {
  const betterSqlite3Path = path.join(__dirname, "../../node_modules/better-sqlite3/build/Release/better_sqlite3.node");
  process.env.BETTER_SQLITE3_BINARY = betterSqlite3Path;
}
function createWindow() {
  services_window_service.WindowService.getInstance().createWindow();
}
electron.app.whenReady().then(() => {
  services_database_service.DatabaseService.getInstance();
  createWindow();
  setupIpcHandlers();
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    services_database_service.DatabaseService.getInstance().close();
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (services_window_service.WindowService.getInstance().getMainWindow() === null) {
    createWindow();
  }
});
