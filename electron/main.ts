import { app, ipcMain } from 'electron'
import { WindowService } from './services/window.service'
import { DatabaseService } from './services/database.service'
import path from 'path'

// 设置 IPC 监听器
function setupIpcHandlers() {
  const windowService = WindowService.getInstance()
  const dbService = DatabaseService.getInstance()

  // 窗口控制
  ipcMain.on('window:minimize', () => {
    windowService.minimizeWindow()
  })

  ipcMain.on('window:maximize', () => {
    windowService.maximizeWindow()
  })

  ipcMain.on('window:close', () => {
    windowService.closeWindow()
  })

  // 数据库操作
  ipcMain.handle('db:getSatelliteData', (_, timeRange?: { start: string; end: string }, satellite?: string) => {
    return dbService.getSatelliteData(timeRange, satellite)
  })

  ipcMain.handle('db:upsertSatelliteData', (_, data) => {
    return dbService.upsertSatelliteData(data)
  })

  ipcMain.handle('db:getEphemerisResults', (_, timeRange?: { start: string; end: string }, sourceSatellite?: string, targetSatellite?: string) => {
    return dbService.getEphemerisResults(timeRange, sourceSatellite, targetSatellite)
  })

  ipcMain.handle('db:upsertEphemerisResult', (_, data) => {
    return dbService.upsertEphemerisResult(data)
  })

  ipcMain.handle('db:getMeasurementMatrices', () => {
    return dbService.getMeasurementMatrices()
  })

  ipcMain.handle('db:upsertMeasurementMatrix', (_, data) => {
    return dbService.upsertMeasurementMatrix(data)
  })

  ipcMain.handle('db:deleteSatelliteData', (_, time: string, satellite: string) => {
    return dbService.deleteSatelliteData(time, satellite)
  })

  ipcMain.handle('db:deleteEphemerisResult', (_, time: string, sourceSatellite: string, targetSatellite: string) => {
    return dbService.deleteEphemerisResult(time, sourceSatellite, targetSatellite)
  })

  ipcMain.handle('db:deleteMeasurementMatrix', (_, name: string) => {
    return dbService.deleteMeasurementMatrix(name)
  })
}

// 设置开发环境下的模块路径
if (process.env.NODE_ENV === 'development') {
  const betterSqlite3Path = path.join(__dirname, '../../node_modules/better-sqlite3/build/Release/better_sqlite3.node')
  process.env.BETTER_SQLITE3_BINARY = betterSqlite3Path
}

function createWindow() {
  WindowService.getInstance().createWindow()
}

app.whenReady().then(() => {
  // 初始化数据库服务
  DatabaseService.getInstance()
  createWindow()
  setupIpcHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    DatabaseService.getInstance().close()
    app.quit()
  }
})

app.on('activate', () => {
  if (WindowService.getInstance().getMainWindow() === null) {
    createWindow()
  }
}) 