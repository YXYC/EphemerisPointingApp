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