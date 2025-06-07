"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
class WindowService {
  constructor() {
    this.mainWindow = null;
  }
  static getInstance() {
    if (!WindowService.instance) {
      WindowService.instance = new WindowService();
    }
    return WindowService.instance;
  }
  createWindow() {
    if (this.mainWindow) {
      return this.mainWindow;
    }
    this.mainWindow = new electron.BrowserWindow({
      width: 1e3,
      height: 615,
      frame: false,
      // 移除默认标题栏
      title: "星历计算工具",
      // 设置窗口标题
      webPreferences: {
        preload: path.join(__dirname, "../preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false
      }
    });
    if (process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      this.mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
    }
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });
    return this.mainWindow;
  }
  getMainWindow() {
    return this.mainWindow;
  }
  closeWindow() {
    if (this.mainWindow) {
      this.mainWindow.close();
    }
  }
  minimizeWindow() {
    if (this.mainWindow) {
      this.mainWindow.minimize();
    }
  }
  maximizeWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    }
  }
}
exports.WindowService = WindowService;
