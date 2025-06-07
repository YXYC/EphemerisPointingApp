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
    try {
      // 调用 uploadAndParseExcel 解析
      const satelliteData = uploadAndParseExcel(buffer)
      const dbService = DatabaseService.getInstance()
      
      // 添加数据验证日志
      console.log('解析到的数据行数:', satelliteData.length)
      if (satelliteData.length > 0) {
        console.log('第一行数据示例:', JSON.stringify(satelliteData[0], null, 2))
      }

      // 验证数据完整性
      const validData = satelliteData.map(item => {
        // 确保所有必需字段都存在，如果不存在则使用 null
        return {
          time: item.time ?? null,
          satellite_name: item.satellite_name ?? null,
          pos_x: typeof item.pos_x === 'number' ? item.pos_x : null,
          pos_y: typeof item.pos_y === 'number' ? item.pos_y : null,
          pos_z: typeof item.pos_z === 'number' ? item.pos_z : null,
          q0: typeof item.q0 === 'number' ? item.q0 : null,
          q1: typeof item.q1 === 'number' ? item.q1 : null,
          q2: typeof item.q2 === 'number' ? item.q2 : null,
          q3: typeof item.q3 === 'number' ? item.q3 : null
        }
      }).filter(item => {
        // 只保留至少有一个非空字段的行
        return Object.values(item).some(value => value !== null)
      })

      // 添加验证后的数据日志
      console.log('验证后的数据行数:', validData.length)
      if (validData.length > 0) {
        console.log('验证后第一行数据示例:', JSON.stringify(validData[0], null, 2))
      }

      // 批量插入有效数据
      await dbService.upsertSatelliteDataBatch(validData)
      return true
    } catch (error) {
      console.error('上传Excel文件失败:', error)
      throw error
    }
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
  ipcMain.handle('satellite:batchCalculate', async (event, params) => {
    try {
      const batchCalculationService = BatchCalculationService.getInstance()
      
      if (!params.startTime || !params.endTime || !params.sourceSatellite || !params.targetSatellite || !params.matrixId) {
        throw new Error('缺少必要的计算参数')
      }

      const progressCallback = (progress: number) => {
        try {
          const mainWindow = WindowService.getInstance().getMainWindow()
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('calculation:progress', progress)
          }
        } catch (error) {
          // 忽略进度更新错误
        }
      }

      const result = await batchCalculationService.batchCalculate(params, progressCallback)
      
      if (!result.success) {
        throw new Error(result.message || '计算失败')
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      try {
        const mainWindow = WindowService.getInstance().getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('calculation:error', errorMessage)
        }
      } catch (e) {
        // 忽略错误通知失败
      }

      throw new Error(errorMessage)
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
    BatchCalculationService.getInstance().cleanup() // 清理工作线程
    app.quit()
  }
})

// 添加应用退出时的清理
app.on('before-quit', () => {
  try {
    // 确保工作线程被清理
    BatchCalculationService.getInstance().cleanup()
    // 关闭数据库连接
    DatabaseService.getInstance().close()
  } catch (error) {
    console.error('应用退出时清理资源失败:', error)
  }
})

app.on('activate', () => {
  if (WindowService.getInstance().getMainWindow() === null) {
    createWindow()
  }
}) 