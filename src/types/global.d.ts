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
    }
  }
}
export {}
