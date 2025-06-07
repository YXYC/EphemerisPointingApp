"use strict";
const electron = require("electron");
const services_window_service = require("./services/window.service.js");
const services_database_service = require("./services/database.service.js");
const services_batchCalculation_service = require("./services/batch-calculation.service.js");
const path = require("path");
const services_upload_service = require("./services/upload.service.js");
const services_satelliteProcessor_service = require("./services/satellite-processor.service.js");
function setupIpcHandlers() {
  const windowService = services_window_service.WindowService.getInstance();
  const dbService = services_database_service.DatabaseService.getInstance();
  services_batchCalculation_service.BatchCalculationService.getInstance();
  electron.ipcMain.on("window:minimize", () => {
    windowService.minimizeWindow();
  });
  electron.ipcMain.on("window:maximize", () => {
    windowService.maximizeWindow();
  });
  electron.ipcMain.on("window:close", () => {
    windowService.closeWindow();
  });
  electron.ipcMain.handle("db:upsertSatelliteData", (_, data) => {
    return dbService.upsertSatelliteData(data);
  });
  electron.ipcMain.handle("db:getEphemerisResults", (_, timeRange, sourceSatellite, targetSatellite, page, pageSize) => {
    return dbService.getEphemerisResults(timeRange, sourceSatellite, targetSatellite, page, pageSize);
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
  electron.ipcMain.handle("satellite:uploadExcel", async (_, { name, buffer }) => {
    try {
      const satelliteData = services_upload_service.uploadAndParseExcel(buffer);
      const dbService2 = services_database_service.DatabaseService.getInstance();
      console.log("解析到的数据行数:", satelliteData.length);
      if (satelliteData.length > 0) {
        console.log("第一行数据示例:", JSON.stringify(satelliteData[0], null, 2));
      }
      const validData = satelliteData.map((item) => {
        return {
          time: item.time ?? null,
          satellite_name: item.satellite_name ?? null,
          pos_x: typeof item.pos_x === "number" ? item.pos_x : null,
          pos_y: typeof item.pos_y === "number" ? item.pos_y : null,
          pos_z: typeof item.pos_z === "number" ? item.pos_z : null,
          q0: typeof item.q0 === "number" ? item.q0 : null,
          q1: typeof item.q1 === "number" ? item.q1 : null,
          q2: typeof item.q2 === "number" ? item.q2 : null,
          q3: typeof item.q3 === "number" ? item.q3 : null
        };
      }).filter((item) => {
        return Object.values(item).some((value) => value !== null);
      });
      console.log("验证后的数据行数:", validData.length);
      if (validData.length > 0) {
        console.log("验证后第一行数据示例:", JSON.stringify(validData[0], null, 2));
      }
      await dbService2.upsertSatelliteDataBatch(validData);
      return true;
    } catch (error) {
      console.error("上传Excel文件失败:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("db:getAllSatelliteNames", () => {
    return dbService.getAllSatelliteNames();
  });
  electron.ipcMain.handle("db:getSatelliteData", (_, timeRange, satellite, page, pageSize) => {
    return dbService.getSatelliteData(timeRange, satellite, page, pageSize);
  });
  electron.ipcMain.handle("db:clearAllTables", () => {
    dbService.clearAllTables();
    return true;
  });
  electron.ipcMain.handle("satellite:calculateRelativeState", (_, params) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const processor = new services_satelliteProcessor_service.SatelliteProcessor();
    processor.setSatelliteState(
      new services_satelliteProcessor_service.Vector3d((_a = params == null ? void 0 : params.satellitePos) == null ? void 0 : _a.x, (_b = params == null ? void 0 : params.satellitePos) == null ? void 0 : _b.y, (_c = params == null ? void 0 : params.satellitePos) == null ? void 0 : _c.z),
      new services_satelliteProcessor_service.Quaternion((_d = params == null ? void 0 : params.satelliteAtt) == null ? void 0 : _d.w, (_e = params == null ? void 0 : params.satelliteAtt) == null ? void 0 : _e.x, (_f = params == null ? void 0 : params.satelliteAtt) == null ? void 0 : _f.y, (_g = params == null ? void 0 : params.satelliteAtt) == null ? void 0 : _g.z)
    );
    processor.setTargetPosition(
      new services_satelliteProcessor_service.Vector3d((_h = params == null ? void 0 : params.targetPos) == null ? void 0 : _h.x, (_i = params == null ? void 0 : params.targetPos) == null ? void 0 : _i.y, (_j = params == null ? void 0 : params.targetPos) == null ? void 0 : _j.z)
    );
    processor.setMeasurementMatrix(params == null ? void 0 : params.roll_urad, params == null ? void 0 : params.pitch_urad, params == null ? void 0 : params.yaw_urad);
    const { distance, yaw, pitch } = processor.calculateRelativeState();
    return {
      distance,
      yaw,
      pitch
    };
  });
  electron.ipcMain.handle("satellite:batchCalculate", async (event, params) => {
    try {
      const batchCalculationService2 = services_batchCalculation_service.BatchCalculationService.getInstance();
      if (!params.startTime || !params.endTime || !params.sourceSatellite || !params.targetSatellite || !params.matrixId) {
        throw new Error("缺少必要的计算参数");
      }
      const progressCallback = (progress) => {
        try {
          const mainWindow = services_window_service.WindowService.getInstance().getMainWindow();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("calculation:progress", progress);
          }
        } catch (error) {
        }
      };
      const result = await batchCalculationService2.batchCalculate(params, progressCallback);
      if (!result.success) {
        throw new Error(result.message || "计算失败");
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      try {
        const mainWindow = services_window_service.WindowService.getInstance().getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("calculation:error", errorMessage);
        }
      } catch (e) {
      }
      throw new Error(errorMessage);
    }
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
    services_batchCalculation_service.BatchCalculationService.getInstance().cleanup();
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  try {
    services_batchCalculation_service.BatchCalculationService.getInstance().cleanup();
    services_database_service.DatabaseService.getInstance().close();
  } catch (error) {
    console.error("应用退出时清理资源失败:", error);
  }
});
electron.app.on("activate", () => {
  if (services_window_service.WindowService.getInstance().getMainWindow() === null) {
    createWindow();
  }
});
