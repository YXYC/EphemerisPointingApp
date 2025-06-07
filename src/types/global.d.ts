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
    }
  }
}
export {}
