import { parentPort, workerData } from 'worker_threads'
import { SatelliteProcessor, Vector3d, Quaternion } from '../services/satellite-processor.service'

// 定义常量
const TIME_THRESHOLD = 1200 // 1.2秒 = 1200毫秒
const MAX_BATCH_SIZE = 1000 // 每批处理的最大数据量

// 定义类型
interface CalculationTask {
  sourceData: {
    time: string
    position: { x: number; y: number; z: number }
    attitude?: { q0: number; q1: number; q2: number; q3: number }
  }[]
  targetData: Map<string, {
    time: string
    position: { x: number; y: number; z: number }
  }>
  sourceSatellite: string
  targetSatellite: string
  matrix: { roll: number; pitch: number; yaw: number }
}

interface CalculationResult {
  time: string
  source_satellite: string
  target_satellite: string
  yaw: number
  pitch: number
  distance: number
}

// 创建处理器实例
const processor = new SatelliteProcessor()

// 验证输入数据
function validateInputData(task: CalculationTask): boolean {
  if (!task.sourceData || !task.targetData || !task.matrix) {
    return false
  }

  if (!task.sourceSatellite || !task.targetSatellite) {
    return false
  }

  if (typeof task.matrix.roll !== 'number' || 
      typeof task.matrix.pitch !== 'number' || 
      typeof task.matrix.yaw !== 'number') {
    return false
  }

  return true
}

// 查找最近的目标点
function findClosestTargetPoint(
  sourceTime: number,
  targetData: Map<string, { time: string; position: { x: number; y: number; z: number } }>
): { time: string; position: { x: number; y: number; z: number } } | null {
  let closestPoint: { time: string; position: { x: number; y: number; z: number } } | null = null
  let minTimeDiff = Infinity

  for (const [targetTime, targetPoint] of targetData.entries()) {
    const timeDiff = Math.abs(new Date(targetTime).getTime() - sourceTime)
    if (timeDiff <= TIME_THRESHOLD && timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff
      closestPoint = targetPoint
    }
  }

  return closestPoint
}

// 验证计算结果
function validateCalculationResult(result: CalculationResult): boolean {
  return (
    typeof result.yaw === 'number' && 
    typeof result.pitch === 'number' && 
    typeof result.distance === 'number' &&
    result.distance > 0 &&
    !isNaN(result.yaw) &&
    !isNaN(result.pitch) &&
    Math.abs(result.yaw) < 2 * Math.PI * 1e6 &&
    Math.abs(result.pitch) < Math.PI * 1e6
  )
}

// 处理单个数据点
function processDataPoint(
  sourcePoint: CalculationTask['sourceData'][0],
  closestTargetPoint: { time: string; position: { x: number; y: number; z: number } },
  sourceSatellite: string,
  targetSatellite: string,
  matrix: CalculationTask['matrix']
): CalculationResult | null {
  if (!sourcePoint.attitude) return null

  try {
    // 设置卫星状态
    processor.setSatelliteState(
      new Vector3d(sourcePoint.position.x, sourcePoint.position.y, sourcePoint.position.z),
      new Quaternion(
        sourcePoint.attitude.q0,
        sourcePoint.attitude.q1,
        sourcePoint.attitude.q2,
        sourcePoint.attitude.q3
      )
    )

    // 设置目标位置
    processor.setTargetPosition(
      new Vector3d(
        closestTargetPoint.position.x,
        closestTargetPoint.position.y,
        closestTargetPoint.position.z
      )
    )

    // 设置精测矩阵
    processor.setMeasurementMatrix(matrix.roll, matrix.pitch, matrix.yaw)

    // 计算相对状态
    const { distance, yaw, pitch } = processor.calculateRelativeState()

    const result = {
      time: sourcePoint.time,
      source_satellite: sourceSatellite,
      target_satellite: targetSatellite,
      yaw: yaw * 1e6,
      pitch: pitch * 1e6,
      distance
    }

    return validateCalculationResult(result) ? result : null
  } catch (error) {
    console.error('处理数据点失败:', error)
    return null
  }
}

// 批量处理数据
function processBatch(task: CalculationTask): CalculationResult[] {
  if (!validateInputData(task)) {
    throw new Error('无效的输入数据')
  }

  const results: CalculationResult[] = []
  const { sourceData, targetData, sourceSatellite, targetSatellite, matrix } = task

  // 分批处理数据
  for (let i = 0; i < sourceData.length; i += MAX_BATCH_SIZE) {
    const batch = sourceData.slice(i, i + MAX_BATCH_SIZE)
    let batchResults = 0
    
    for (const sourcePoint of batch) {
      const sourceTime = new Date(sourcePoint.time).getTime()
      const closestTargetPoint = findClosestTargetPoint(sourceTime, targetData)

      if (closestTargetPoint) {
        const result = processDataPoint(
          sourcePoint,
          closestTargetPoint,
          sourceSatellite,
          targetSatellite,
          matrix
        )

        if (result) {
          results.push(result)
          batchResults++
        }
      }
    }

    // 定期发送进度更新
    if (parentPort) {
      const progress = Math.min(100, (i + batch.length) / sourceData.length * 100)
      parentPort.postMessage({
        type: 'progress',
        progress
      })
    }
  }

  return results
}

// 处理工作线程消息
if (parentPort) {
  parentPort.on('message', (task: CalculationTask) => {
    try {
      const results = processBatch(task)
      parentPort?.postMessage({ 
        type: 'complete',
        success: true, 
        results 
      })
    } catch (error) {
      parentPort?.postMessage({ 
        type: 'error',
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      })
    }
  })

  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    parentPort?.postMessage({
      type: 'error',
      success: false,
      error: `未捕获的异常: ${error.message}`
    })
  })

  // 处理未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason) => {
    parentPort?.postMessage({
      type: 'error',
      success: false,
      error: `未处理的 Promise 拒绝: ${reason}`
    })
  })
} 