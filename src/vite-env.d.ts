/// <reference types="vite/client" />

// Global API declarations for Electron preload
declare global {
  interface Window {
    ipcRenderer: {
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => void
      off: (channel: string, listener?: (...args: any[]) => void) => void
      send: (channel: string, ...args: any[]) => void
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }

    globalRecorder: {
      startRecording: () => Promise<{ success: boolean; message: string }>
      stopRecording: () => Promise<{ success: boolean; data?: any[]; message: string }>
      captureScreen: () => Promise<{ success: boolean; screenshot?: string; message?: string }>
      getActiveWindowInfo: () => Promise<{ success: boolean; windowInfo?: any; message?: string }>
      onEventCaptured: (callback: (event: any) => void) => void
      removeEventListeners: () => void
    }

    screenCapture: {
      captureScreen: (options?: {
        quality?: 'low' | 'medium' | 'high' | 'ultra'
        format?: 'png' | 'jpeg'
        captureArea?: { x: number; y: number; width: number; height: number }
        annotations?: any
      }) => Promise<{
        success: boolean
        screenshot?: string
        metadata?: any
        error?: string
      }>
      captureWindow: (windowId?: number) => Promise<{
        success: boolean
        screenshot?: string
        metadata?: any
        error?: string
      }>
      captureRegion: (region: { x: number; y: number; width: number; height: number }) => Promise<{
        success: boolean
        screenshot?: string
        metadata?: any
        error?: string
      }>
      getSources: () => Promise<{ screens: any[]; windows: any[] }>
      captureHighQuality: () => Promise<any>
      captureLowQuality: () => Promise<any>
    }

    contextCollector: {
      getWindowContext: () => Promise<{
        title: string
        processName: string
        processId: number
        bounds: { x: number; y: number; width: number; height: number }
        isVisible: boolean
        isMinimized: boolean
        isMaximized: boolean
        zIndex: number
      } | null>
      getSystemContext: () => Promise<{
        platform: string
        architecture: string
        totalMemory: number
        freeMemory: number
        cpuCount: number
        uptime: number
        displays: any[]
        cursorPosition: { x: number; y: number }
      } | null>
      getFullContext: (userAction: {
        type: 'mouse' | 'keyboard' | 'scroll' | 'window'
        details: any
      }) => Promise<any>
    }
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  // expose in the `electron/preload/index.ts`
  ipcRenderer: import('electron').IpcRenderer
}
