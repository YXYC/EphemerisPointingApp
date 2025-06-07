import { BrowserWindow, app } from 'electron'
import { join } from 'path'

export class WindowService {
  private static instance: WindowService
  private mainWindow: BrowserWindow | null = null

  private constructor() {}

  public static getInstance(): WindowService {
    if (!WindowService.instance) {
      WindowService.instance = new WindowService()
    }
    return WindowService.instance
  }

  public createWindow(): BrowserWindow {
    if (this.mainWindow) {
      return this.mainWindow
    }

    this.mainWindow = new BrowserWindow({
      width: 1000,
      height: 600,
      frame: false, // 移除默认标题栏
      webPreferences: {
        preload: join(__dirname, '../preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false
      },
    })

    if (process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
      this.mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
    }

    // 窗口关闭时清理引用
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })

    return this.mainWindow
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  public closeWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.close()
    }
  }

  public minimizeWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.minimize()
    }
  }

  public maximizeWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize()
      } else {
        this.mainWindow.maximize()
      }
    }
  }
} 