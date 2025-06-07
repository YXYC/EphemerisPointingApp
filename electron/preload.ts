import { contextBridge, ipcRenderer } from 'electron'

// 定义窗口控制通道
const WINDOW_CONTROL_CHANNELS = {
  MINIMIZE: 'window:minimize',
  MAXIMIZE: 'window:maximize',
  CLOSE: 'window:close'
}

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('windowControl', {
  
  minimize: () => ipcRenderer.send(WINDOW_CONTROL_CHANNELS.MINIMIZE),
  maximize: () => ipcRenderer.send(WINDOW_CONTROL_CHANNELS.MAXIMIZE),
  close: () => ipcRenderer.send(WINDOW_CONTROL_CHANNELS.CLOSE)
})

contextBridge.exposeInMainWorld('satellite', {
  uploadExcel: (name: string, buffer: ArrayBuffer) =>
    ipcRenderer.invoke('satellite:uploadExcel', { name, buffer }),
  getSatelliteData: (
    timeRange?: { start: string; end: string },
    satellite?: string,
    page: number = 1,
    pageSize: number = 10
  ) => ipcRenderer.invoke('db:getSatelliteData', timeRange, satellite, page, pageSize),
  getAllSatelliteNames: () => ipcRenderer.invoke('db:getAllSatelliteNames'),
  clearAllTables: () => ipcRenderer.invoke('db:clearAllTables'),
  calculateRelativeState: (params: {
    satellitePos?: { x?: number, y?: number, z?: number }
    satelliteAtt?: { w?: number, x?: number, y?: number, z?: number }
    targetPos?: { x?: number, y?: number, z?: number }
    roll_urad?: number
    pitch_urad?: number
    yaw_urad?: number
  }) => ipcRenderer.invoke('satellite:calculateRelativeState', params)
}) 