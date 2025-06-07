import { app, ipcMain } from 'electron'
import { WindowService } from './services/window.service'
import { DatabaseService } from './services/database.service'
import { BatchCalculationService } from './services/batch-calculation.service'
import path from 'path'
import { uploadAndParseExcel } from './services/upload.service'
import { SatelliteProcessor, Vector3d, Quaternion } from './services/satellite-processor.service'

// 设置 IPC 监听器
function setupIpcHandlers() {
  const windowService = WindowService.getInstance()
  const dbService = DatabaseService.getInstance()
  const batchCalculationService = BatchCalculationService.getInstance()

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
  ipcMain.handle('db:upsertSatelliteData', (_, data) => {
    return dbService.upsertSatelliteData(data)
  })

  ipcMain.handle('db:getEphemerisResults', (_, timeRange?: { start: string; end: string }, sourceSatellite?: string, targetSatellite?: string, page?: number, pageSize?: number) => {
    return dbService.getEphemerisResults(timeRange, sourceSatellite, targetSatellite, page, pageSize)
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

  ipcMain.handle('satellite:uploadExcel', async (_, { name, buffer }) => {
    // 调用 uploadAndParseExcel 解析
    const satelliteData = uploadAndParseExcel(buffer)
    const dbService = DatabaseService.getInstance()
    //此处报错可以忽略，已经可以插入null值
    dbService.upsertSatelliteDataBatch(satelliteData)
    return true
  })

  ipcMain.handle('db:getAllSatelliteNames', () => {
    return dbService.getAllSatelliteNames()
  })

  ipcMain.handle('db:getSatelliteData', (_, timeRange, satellite, page, pageSize) => {
    return dbService.getSatelliteData(timeRange, satellite, page, pageSize)
  })

  ipcMain.handle('db:clearAllTables', () => {
    dbService.clearAllTables()
    return true
  })

  ipcMain.handle('satellite:calculateRelativeState', (_, params) => {
    // 允许参数为空，自动用默认值
    const processor = new SatelliteProcessor()
    processor.setSatelliteState(
      new Vector3d(params?.satellitePos?.x, params?.satellitePos?.y, params?.satellitePos?.z),
      new Quaternion(params?.satelliteAtt?.w, params?.satelliteAtt?.x, params?.satelliteAtt?.y, params?.satelliteAtt?.z)
    )
    processor.setTargetPosition(
      new Vector3d(params?.targetPos?.x, params?.targetPos?.y, params?.targetPos?.z)
    )
    processor.setMeasurementMatrix(params?.roll_urad, params?.pitch_urad, params?.yaw_urad)
    const { distance, yaw, pitch } = processor.calculateRelativeState()
    return {
      distance,
      yaw,
      pitch
    }
  })

  // 批量计算
  ipcMain.handle('satellite:batchCalculate', async (_, params) => {
    try {
      const result = await batchCalculationService.batchCalculate(params)
      return result  // 直接返回计算结果
    } catch (error) {
      console.error('批量计算失败:', {
        error: error instanceof Error ? error.message : String(error),
        params: {
          startTime: params.startTime,
          endTime: params.endTime,
          sourceSatellite: params.sourceSatellite,
          targetSatellite: params.targetSatellite,
          matrixId: params.matrixId
        }
      })
      throw error
    }
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