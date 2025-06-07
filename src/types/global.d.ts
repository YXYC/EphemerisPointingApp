declare global {
  interface Window {
    //解决报错
    satellite: {
      uploadExcel: (name: string, buffer: ArrayBuffer) => Promise<any>
      getSatelliteData: (
        timeRange?: { start: string; end: string },
        satellite?: string,
        page?: number,
        pageSize?: number
      ) => Promise<{ data: any[]; total: number }>
      getAllSatelliteNames: () => Promise<string[]>
      clearAllTables: () => Promise<any>
      calculateRelativeState: (params: {
        satellitePos?: { x?: number, y?: number, z?: number }
        satelliteAtt?: { w?: number, x?: number, y?: number, z?: number }
        targetPos?: { x?: number, y?: number, z?: number }
        roll_urad?: number
        pitch_urad?: number
        yaw_urad?: number
      }) => Promise<{ distance: number, yaw: number, pitch: number }>
      getMeasurementMatrices: () => Promise<Array<{
        name: string
        roll_urad: number
        pitch_urad: number
        yaw_urad: number
      }>>
      upsertMeasurementMatrix: (data: {
        name: string
        roll_urad: number
        pitch_urad: number
        yaw_urad: number
      }) => Promise<any>
      deleteMeasurementMatrix: (name: string) => Promise<any>
      batchCalculate: (params: {
        startTime: string
        endTime: string
        sourceSatellite: string
        targetSatellite: string
        matrixId: string
      }) => Promise<CalculationResponse>
      getEphemerisResults: (
        timeRange?: { start: string; end: string },
        sourceSatellite?: string,
        targetSatellite?: string,
        page?: number,
        pageSize?: number
      ) => Promise<{ data: Array<{
        time: string
        source_satellite: string
        target_satellite: string
        distance: number
        yaw: number
        pitch: number
      }>; total: number }>
    }
  }
}

// 添加卫星数据接口类型
interface SatelliteDataItem {
  time: string
  satellite_name: string
  pos_x: number
  pos_y: number
  pos_z: number
  q0: number
  q1: number
  q2: number
  q3: number
}

// 添加精测矩阵接口类型
interface MeasurementMatrix {
  name: string
  roll_urad: number
  pitch_urad: number
  yaw_urad: number
}

// 添加计算结果接口类型
interface CalculationResponse {
  success: boolean
  message: string
  results?: Array<{
    time: string
    source_satellite: string
    target_satellite: string
    yaw: number
    pitch: number
    distance: number
  }>
}

declare global {
  interface Window {
    satellite: {
      getAllSatelliteNames: () => Promise<string[]>
      getMeasurementMatrices: () => Promise<any[]>
      upsertMeasurementMatrix: (matrix: any) => Promise<void>
      deleteMeasurementMatrix: (id: string) => Promise<void>
      batchCalculate: (params: {
        startTime: string
        endTime: string
        sourceSatellite: string
        targetSatellite: string
        matrixId: string
      }) => Promise<CalculationResponse>
      getSatelliteData: (params: {
        start?: string
        end?: string
      } | null, satelliteName?: string, page?: number, pageSize?: number) => Promise<{
        data: any[]
        total: number
      }>
      uploadExcel: (fileName: string, buffer: ArrayBuffer) => Promise<void>
      clearAllTables: () => Promise<void>
    }
  }
}

export { SatelliteDataItem, MeasurementMatrix, CalculationResponse }
export {}
