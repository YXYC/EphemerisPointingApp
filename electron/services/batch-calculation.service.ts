import { DatabaseService } from './database.service'
import { Worker } from 'worker_threads'
import path from 'path'
import { app } from 'electron'
import { SatelliteProcessor, Vector3d, Quaternion } from './satellite-processor.service'
import { SatelliteDataItem, MeasurementMatrix } from '../../src/types/global'

interface CalculationParams {
  startTime: string
  endTime: string
  sourceSatellite: string
  targetSatellite: string
  matrixId: string
}

interface SatelliteData {
  time: string
  position: {
    x: number
    y: number
    z: number
  }
  attitude?: {
    q0: number
    q1: number
    q2: number
    q3: number
  }
}

interface CalculationResult {
  time: string
  source_satellite: string
  target_satellite: string
  yaw: number
  pitch: number
  distance: number
}

interface CalculationResponse {
  success: boolean    // 是否成功
  message: string     // 提示信息
  results?: CalculationResult[]  // 可选的计算结果
}

export class BatchCalculationService {
  private static instance: BatchCalculationService
  private dbService: DatabaseService
  private workerPool: Map<number, Worker> = new Map()
  private taskQueue: Array<{
    task: any
    resolve: (value: any) => void
    reject: (error: any) => void
  }> = []
  private readonly MAX_WORKERS = 4
  private readonly WORKER_TIMEOUT = 30000 // 30秒超时
  private satelliteProcessor: SatelliteProcessor
  private nextWorkerId = 0
  private activeWorkerCount = 0

  private constructor() {
    this.dbService = DatabaseService.getInstance()
    this.satelliteProcessor = new SatelliteProcessor()
  }

  private createWorker(): number {
    const workerId = this.nextWorkerId++
    const workerPath = path.join(__dirname, '../../dist-electron/workers/calculation.worker.js')
    
    if (!require('fs').existsSync(workerPath)) {
      throw new Error(`Worker 文件不存在: ${workerPath}`)
    }

    const worker = new Worker(workerPath)
    this.activeWorkerCount++

    worker.on('message', (result) => {
      const task = this.taskQueue.shift()
      if (task) {
        task.resolve(result)
      }
      this.workerPool.set(workerId, worker)
      this.processNextTask()
    })

    worker.on('error', (error) => {
      this.handleWorkerError(workerId, error)
    })

    worker.on('exit', (code) => {
      if (code !== 0) {
        this.handleWorkerExit(workerId)
      }
    })

    this.workerPool.set(workerId, worker)
    return workerId
  }

  private getAvailableWorker(): Worker | null {
    // 如果当前活跃的 Worker 数量小于最大值，创建新的 Worker
    if (this.activeWorkerCount < this.MAX_WORKERS) {
      try {
        this.createWorker()
      } catch (error) {
        return null
      }
    }

    // 从现有 Worker 池中获取可用的 Worker
    for (const worker of this.workerPool.values()) {
      if (worker.threadId) {
        return worker
      }
    }

    return null
  }

  private handleWorkerError(workerId: number, error: Error) {
    const worker = this.workerPool.get(workerId)
    if (worker) {
      try {
        worker.terminate()
      } catch (e) {
        // 忽略终止错误
      }
      this.workerPool.delete(workerId)
      this.activeWorkerCount--
      
      // 处理当前任务
      const task = this.taskQueue.shift()
      if (task) {
        task.reject(error)
      }
    }
  }

  private handleWorkerExit(workerId: number) {
    this.workerPool.delete(workerId)
    this.activeWorkerCount--
  }

  private processNextTask() {
    if (this.taskQueue.length === 0) return

    const worker = this.getAvailableWorker()
    if (!worker) {
      // 如果没有可用的 Worker，创建新的
      this.createWorker()
      return
    }

    const task = this.taskQueue[0]
    const timeoutId = setTimeout(() => {
      const index = this.taskQueue.findIndex(t => t === task)
      if (index !== -1) {
        this.taskQueue.splice(index, 1)
        task.reject(new Error('Worker 任务超时'))
      }
    }, this.WORKER_TIMEOUT)

    worker.postMessage(task.task)
  }

  private async processTaskWithWorker(task: any): Promise<{ success: boolean; results?: CalculationResult[]; error?: string }> {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker()
      if (!worker) {
        resolve({ success: false, error: '没有可用的 Worker' })
        return
      }
      
      const messageHandler = (message: any) => {
        if (message.type === 'progress') {
          return
        }
        
        worker.removeListener('message', messageHandler)
        
        if (message.type === 'error') {
          resolve({ success: false, error: message.error })
          return
        }
        
        if (message.type === 'complete' && message.success) {
          resolve({ success: true, results: message.results })
          return
        }
        
        if (message.success && Array.isArray(message.results)) {
          resolve({ success: true, results: message.results })
          return
        }
        
        resolve({ success: false, error: '未知的 Worker 消息格式' })
      }
      
      const errorHandler = (error: Error) => {
        worker.removeListener('error', errorHandler)
        resolve({ success: false, error: error.message })
      }
      
      worker.on('message', messageHandler)
      worker.once('error', errorHandler)
      worker.postMessage(task)
    })
  }

  public static getInstance(): BatchCalculationService {
    if (!BatchCalculationService.instance) {
      BatchCalculationService.instance = new BatchCalculationService()
    }
    return BatchCalculationService.instance
  }

  // 检查两个时间点是否在1.2秒内
  private isWithinTimeThreshold(time1: string, time2: string): boolean {
    const t1 = new Date(time1).getTime()
    const t2 = new Date(time2).getTime()
    return Math.abs(t1 - t2) <= 1200 // 1.2秒 = 1200毫秒
  }

  // 获取卫星数据
  private async getSatelliteData(satelliteName: string, startTime: string, endTime: string, startPage: number, pageSize: number): Promise<SatelliteData[]> {
    try {
      // 验证时间格式
      const start = new Date(startTime)
      const end = new Date(endTime)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error(`无效的时间格式: startTime=${startTime}, endTime=${endTime}`)
      }

      // 获取数据
      const { data } = await this.dbService.getSatelliteData(
        { start: startTime, end: endTime },
        satelliteName,
        startPage,
        pageSize
      )

      // 验证数据
      if (!Array.isArray(data)) {
        throw new Error(`获取卫星数据返回格式错误: ${JSON.stringify(data)}`)
      }

      // 检查数据是否为空
      if (data.length === 0) {
        console.log(`卫星 ${satelliteName} 在时间范围 ${startTime} 到 ${endTime} 内没有数据`)
        return []
      }

      // 检查数据格式
      const validData = (data as SatelliteDataItem[]).filter(item => {
        if (!item.time || !item.satellite_name || 
            typeof item.pos_x !== 'number' || 
            typeof item.pos_y !== 'number' || 
            typeof item.pos_z !== 'number') {
          console.warn(`跳过无效数据点: ${JSON.stringify(item)}`)
          return false
        }
        return true
      })

      if (validData.length === 0) {
        console.log(`卫星 ${satelliteName} 在时间范围内没有有效数据`)
        return []
      }

      // 转换数据格式
      return validData.map(item => ({
        time: item.time,
        position: {
          x: item.pos_x,
          y: item.pos_y,
          z: item.pos_z
        },
        attitude: (typeof item.q0 === 'number' && 
                  typeof item.q1 === 'number' && 
                  typeof item.q2 === 'number' && 
                  typeof item.q3 === 'number') ? {
          q0: item.q0,
          q1: item.q1,
          q2: item.q2,
          q3: item.q3
        } : undefined
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`获取卫星 ${satelliteName} 数据失败:`, errorMessage)
      throw new Error(`获取卫星 ${satelliteName} 数据失败: ${errorMessage}`)
    }
  }

  // 获取精测矩阵数据
  private async getMeasurementMatrix(matrixId: string) {
    try {
      const matrices = await this.dbService.getMeasurementMatrices()
      const matrix = (matrices as MeasurementMatrix[]).find(m => m.name === matrixId)
      
      if (!matrix) {
        throw new Error(`未找到ID为 ${matrixId} 的精测矩阵`)
      }

      return {
        roll: matrix.roll_urad,
        pitch: matrix.pitch_urad,
        yaw: matrix.yaw_urad
      }
    } catch (error) {
      throw new Error(`获取精测矩阵数据失败: ${error}`)
    }
  }

  // 保存计算结果
  private async saveCalculationResults(results: CalculationResult[]) {
    try {
      for (const result of results) {
        await this.dbService.upsertEphemerisResult({
          time: result.time,
          source_satellite: result.source_satellite,
          target_satellite: result.target_satellite,
          yaw: result.yaw,
          pitch: result.pitch,
          distance: result.distance
        })
      }
    } catch (error) {
      throw new Error(`保存计算结果失败: ${error}`)
    }
  }

  // 批量计算主函数
  public async batchCalculate(
    params: CalculationParams,
    progressCallback?: (progress: number) => void
  ): Promise<CalculationResponse> {
    const { startTime, endTime, sourceSatellite, targetSatellite, matrixId } = params
    
    try {
      if (!startTime || !endTime || !sourceSatellite || !targetSatellite || !matrixId) {
        return {
          success: false,
          message: '缺少必要的计算参数'
        }
      }

      const matrix = await this.getMeasurementMatrix(matrixId)
      
      const [sourceData, targetData] = await Promise.all([
        this.getSatelliteData(sourceSatellite, startTime, endTime, 1, 100000),
        this.getSatelliteData(targetSatellite, startTime, endTime, 1, 100000)
      ])
      
      if (sourceData.length === 0 || targetData.length === 0) {
        const missingSource = sourceData.length === 0 ? `本星 "${sourceSatellite}"` : ''
        const missingTarget = targetData.length === 0 ? `对星 "${targetSatellite}"` : ''
        const missingSatellites = [missingSource, missingTarget].filter(Boolean).join('、')
        
        return {
          success: false,
          message: `${missingSatellites} 在时间范围 ${startTime} 到 ${endTime} 内没有数据，请先导入卫星数据`
        }
      }

      const targetTimeMap = new Map<string, SatelliteData>()
      for (const target of targetData) {
        targetTimeMap.set(target.time, target)
      }
      
      const BATCH_SIZE = 1000
      const totalBatches = Math.ceil(sourceData.length / BATCH_SIZE)
      const tasks = []
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE
        const end = Math.min(start + BATCH_SIZE, sourceData.length)
        const batchSourceData = sourceData.slice(start, end)
        
        tasks.push({
          sourceData: batchSourceData,
          targetData: targetTimeMap,
          sourceSatellite,
          targetSatellite,
          matrix
        })
      }
      
      const batchResults = await Promise.all(
        tasks.map(async (task, index) => {
          const result = await this.processTaskWithWorker(task)
          if (progressCallback) {
            const progress = Math.min(100, ((index + 1) / totalBatches) * 100)
            progressCallback(progress)
          }
          return result
        })
      )
      
      const calculationResults: CalculationResult[] = []
      let hasError = false
      let errorMessage = ''
      
      for (const result of batchResults) {
        if (result.success && result.results && result.results.length > 0) {
          calculationResults.push(...result.results)
          try {
            await this.saveCalculationResults(result.results)
          } catch (error) {
            hasError = true
            errorMessage = '保存计算结果时发生错误'
          }
        } else if (!result.success) {
          hasError = true
          errorMessage = result.error || '批次处理失败'
        }
      }
      
      if (calculationResults.length > 0) {
        const displayResults = calculationResults.map(result => ({
          ...result,
          yaw: result.yaw / 1e6 * (180 / Math.PI),
          pitch: result.pitch / 1e6 * (180 / Math.PI)
        }))
        
        return {
          success: true,
          message: hasError ? `计算完成，但${errorMessage}` : '计算完成',
          results: displayResults
        }
      } else {
        return {
          success: false,
          message: hasError ? errorMessage : '没有符合的完整数据，请检查输入数据是否完整'
        }
      }
      
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // 清理资源
  public cleanup() {
    for (const worker of this.workerPool.values()) {
      try {
        worker.terminate()
      } catch (e) {
        // 忽略终止错误
      }
    }
    this.workerPool.clear()
    this.activeWorkerCount = 0
    this.taskQueue = []
  }

  // 处理单个批次的数据
  private async processBatch(
    sourceData: SatelliteData[],
    targetTimeMap: Map<string, SatelliteData>,
    sourceSatellite: string,
    targetSatellite: string,
    matrix: { roll: number; pitch: number; yaw: number }
  ): Promise<CalculationResult[]> {
    const results: CalculationResult[] = []
    
    for (const sourcePoint of sourceData) {
      if (!sourcePoint.attitude) continue
      
      // 查找最近的对星数据点
      let closestTargetPoint: SatelliteData | null = null
      let minTimeDiff = Infinity
      
      // 在时间阈值范围内查找最近的点
      const sourceTime = new Date(sourcePoint.time).getTime()
      for (const [targetTime, targetPoint] of targetTimeMap.entries()) {
        const timeDiff = Math.abs(new Date(targetTime).getTime() - sourceTime)
        if (timeDiff <= 1200 && timeDiff < minTimeDiff) { // 1.2秒 = 1200毫秒
          minTimeDiff = timeDiff
          closestTargetPoint = targetPoint
        }
      }
      
      if (closestTargetPoint) {
        try {
          // 设置卫星状态
          this.satelliteProcessor.setSatelliteState(
            new Vector3d(sourcePoint.position.x, sourcePoint.position.y, sourcePoint.position.z),
            new Quaternion(sourcePoint.attitude.q0, sourcePoint.attitude.q1, sourcePoint.attitude.q2, sourcePoint.attitude.q3)
          )
          
          // 设置目标位置
          this.satelliteProcessor.setTargetPosition(
            new Vector3d(closestTargetPoint.position.x, closestTargetPoint.position.y, closestTargetPoint.position.z)
          )
          
          // 设置精测矩阵
          this.satelliteProcessor.setMeasurementMatrix(matrix.roll, matrix.pitch, matrix.yaw)
          
          // 计算相对状态
          const { distance, yaw, pitch } = this.satelliteProcessor.calculateRelativeState()
          
          // 验证计算结果
          const result = {
            time: sourcePoint.time,
            source_satellite: sourceSatellite,
            target_satellite: targetSatellite,
            yaw: yaw * 1e6,     // 转换为微弧度
            pitch: pitch * 1e6,  // 转换为微弧度
            distance
          }
          
          if (this.validateCalculationResult(result)) {
            results.push(result)
          }
        } catch (error) {
          // 忽略单个点的计算错误，继续处理下一个点
          continue
        }
      }
    }
    
    return results
  }

  private validateSatelliteData(data: SatelliteData[], satelliteName: string) {
    const invalidPoints = data.filter(d => !d.attitude)
    if (invalidPoints.length > 0) {
      console.warn(`卫星 ${satelliteName} 有 ${invalidPoints.length} 个点缺少姿态数据`)
    }
    return invalidPoints.length === 0
  }

  private validateCalculationResult(result: CalculationResult) {
    const isValid = 
      typeof result.yaw === 'number' && 
      typeof result.pitch === 'number' && 
      typeof result.distance === 'number' &&
      result.distance > 0 &&
      !isNaN(result.yaw) &&
      !isNaN(result.pitch) &&
      Math.abs(result.yaw) < 2 * Math.PI * 1e6 &&  // 检查是否在合理范围内
      Math.abs(result.pitch) < Math.PI * 1e6       // 检查是否在合理范围内
    
    return isValid
  }
} 