import { DatabaseService } from './database.service'
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
  private satelliteProcessor: SatelliteProcessor

  private constructor() {
    this.dbService = DatabaseService.getInstance()
    this.satelliteProcessor = new SatelliteProcessor()
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
  private async getSatelliteData(satelliteName: string, startTime: string, endTime: string): Promise<SatelliteData[]> {
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
        1,
        10000
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
  public async batchCalculate(params: CalculationParams): Promise<CalculationResponse> {
    const { startTime, endTime, sourceSatellite, targetSatellite, matrixId } = params
    
    try {
      // 验证输入参数
      if (!startTime || !endTime || !sourceSatellite || !targetSatellite || !matrixId) {
        return {
          success: false,
          message: '缺少必要的计算参数'
        }
      }

      // 1. 获取精测矩阵数据
      const matrix = await this.getMeasurementMatrix(matrixId)
      
      // 2. 获取本星和对星数据
      const [sourceData, targetData] = await Promise.all([
        this.getSatelliteData(sourceSatellite, startTime, endTime),
        this.getSatelliteData(targetSatellite, startTime, endTime)
      ])
      
      // 检查数据是否存在
      if (sourceData.length === 0 || targetData.length === 0) {
        const missingSource = sourceData.length === 0 ? `本星 "${sourceSatellite}"` : ''
        const missingTarget = targetData.length === 0 ? `对星 "${targetSatellite}"` : ''
        const missingSatellites = [missingSource, missingTarget].filter(Boolean).join('、')
        
        return {
          success: false,
          message: `${missingSatellites} 在时间范围 ${startTime} 到 ${endTime} 内没有数据，请先导入卫星数据`
        }
      }
      
      // 3. 计算结果数组
      const results: CalculationResult[] = []
      let matchedPoints = 0
      let skippedPoints = 0
      let timeDiffs: number[] = []
      
      // 4. 遍历本星数据，找到最近的对星数据点进行计算
      for (const sourcePoint of sourceData) {
        // 找到最近的对星数据点
        let closestTargetPoint: SatelliteData | null = null
        let minTimeDiff = Infinity
        
        for (const targetPoint of targetData) {
          if (this.isWithinTimeThreshold(sourcePoint.time, targetPoint.time)) {
            const timeDiff = Math.abs(new Date(sourcePoint.time).getTime() - new Date(targetPoint.time).getTime())
            if (timeDiff < minTimeDiff) {
              minTimeDiff = timeDiff
              closestTargetPoint = targetPoint
            }
          }
        }
        
        // 如果找到合适的对星数据点，进行计算
        if (closestTargetPoint && sourcePoint.attitude) {
          matchedPoints++
          timeDiffs.push(minTimeDiff)
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
            
            // 输出组合后的输入参数
            console.log('计算输入参数:', {
              time: sourcePoint.time,
              sourceSatellite: {
                name: sourceSatellite,
                position: {
                  x: sourcePoint.position.x,
                  y: sourcePoint.position.y,
                  z: sourcePoint.position.z
                },
                attitude: {
                  q0: sourcePoint.attitude.q0,
                  q1: sourcePoint.attitude.q1,
                  q2: sourcePoint.attitude.q2,
                  q3: sourcePoint.attitude.q3
                }
              },
              targetSatellite: {
                name: targetSatellite,
                position: {
                  x: closestTargetPoint.position.x,
                  y: closestTargetPoint.position.y,
                  z: closestTargetPoint.position.z
                }
              },
              measurementMatrix: {
                roll_urad: matrix.roll,
                pitch_urad: matrix.pitch,
                yaw_urad: matrix.yaw
              },
              timestamp: new Date().toISOString()
            })
            
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
            } else {
              skippedPoints++
            }
          } catch (error) {
            skippedPoints++
          }
        } else {
          skippedPoints++
        }
      }
      
      // 5. 保存计算结果
      if (results.length > 0) {
        await this.saveCalculationResults(results)
        
        // 转换结果为角度用于前端显示
        const displayResults = results.map(result => ({
          ...result,
          yaw: result.yaw / 1e6 * (180 / Math.PI),    // 微弧度转角度
          pitch: result.pitch / 1e6 * (180 / Math.PI)  // 微弧度转角度
        }))
        
        return {
          success: true,
          message: '计算完成',
          results: displayResults
        }
      } else {
        return {
          success: false,
          message: '没有符合的完整数据'
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        message: errorMessage
      }
    }
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