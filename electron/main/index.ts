import { app, BrowserWindow, shell, ipcMain, desktopCapturer, screen, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import 'animate.css';

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'StepCraft',
    icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    // win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})


// 路由相关内容请移至 src 目录下的 Vue 项目入口文件

import { GlobalRecorder } from './global-recorder'
import { ScreenCaptureManager } from './screen-capture'
import { ContextCollector } from './context-collector'

// Global recorder instance
let globalRecorder: GlobalRecorder | null = null
let screenCaptureManager: ScreenCaptureManager | null = null
let contextCollector: ContextCollector | null = null

// IPC handlers for global recording
ipcMain.handle('start-global-recording', async () => {
  try {
    if (!globalRecorder && win) {
      globalRecorder = new GlobalRecorder(win)
    }

    if (globalRecorder) {
      return await globalRecorder.startRecording()
    }

    return { success: false, message: 'Global recorder not initialized' }
  } catch (error) {
    console.error('Failed to start global recording:', error)
    return { success: false, message: error.message }
  }
})

ipcMain.handle('stop-global-recording', async () => {
  try {
    if (globalRecorder) {
      return await globalRecorder.stopRecording()
    }

    return { success: false, message: 'No global recorder instance' }
  } catch (error) {
    console.error('Failed to stop global recording:', error)
    return { success: false, message: error.message }
  }
})

ipcMain.handle('capture-screen', async () => {
  try {
    if (globalRecorder) {
      return await globalRecorder.captureScreenshot()
    }

    // Fallback direct capture
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    })

    if (sources.length > 0) {
      return {
        success: true,
        screenshot: sources[0].thumbnail.toDataURL()
      }
    }

    return { success: false, message: 'No screen sources available' }
  } catch (error) {
    console.error('Failed to capture screen:', error)
    return { success: false, message: error.message }
  }
})

ipcMain.handle('get-active-window-info', async () => {
  try {
    if (globalRecorder) {
      return await globalRecorder.getActiveWindowInfo()
    }

    // Fallback implementation
    const displays = screen.getAllDisplays()
    const primaryDisplay = screen.getPrimaryDisplay()

    return {
      success: true,
      windowInfo: {
        title: 'Unknown Window',
        bounds: primaryDisplay.bounds,
        displays: displays.map(d => ({
          id: d.id,
          bounds: d.bounds,
          workArea: d.workArea
        }))
      }
    }
  } catch (error) {
    console.error('Failed to get window info:', error)
    return { success: false, message: error.message }
  }
})

// Enhanced screen capture handlers
ipcMain.handle('capture-screen-enhanced', async (_, options = {}) => {
  try {
    if (!screenCaptureManager) {
      screenCaptureManager = new ScreenCaptureManager()
    }

    return await screenCaptureManager.captureScreen(options)
  } catch (error) {
    console.error('Enhanced screen capture failed:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('capture-window', async (_, windowId) => {
  try {
    if (!screenCaptureManager) {
      screenCaptureManager = new ScreenCaptureManager()
    }

    return await screenCaptureManager.captureWindow(windowId)
  } catch (error) {
    console.error('Window capture failed:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('capture-region', async (_, region) => {
  try {
    if (!screenCaptureManager) {
      screenCaptureManager = new ScreenCaptureManager()
    }

    return await screenCaptureManager.captureRegion(region)
  } catch (error) {
    console.error('Region capture failed:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-capture-sources', async () => {
  try {
    if (!screenCaptureManager) {
      screenCaptureManager = new ScreenCaptureManager()
    }

    return await screenCaptureManager.getAvailableSources()
  } catch (error) {
    console.error('Failed to get capture sources:', error)
    return { screens: [], windows: [] }
  }
})

// Context collection handlers
ipcMain.handle('get-window-context', async () => {
  try {
    if (!contextCollector && win) {
      contextCollector = new ContextCollector(win)
    }

    if (contextCollector) {
      return await contextCollector.getActiveWindowContext()
    }

    return null
  } catch (error) {
    console.error('Failed to get window context:', error)
    return null
  }
})

ipcMain.handle('get-system-context', async () => {
  try {
    if (!contextCollector && win) {
      contextCollector = new ContextCollector(win)
    }

    if (contextCollector) {
      return await contextCollector.getSystemContext()
    }

    return null
  } catch (error) {
    console.error('Failed to get system context:', error)
    return null
  }
})

ipcMain.handle('get-full-context', async (_, userAction) => {
  try {
    if (!contextCollector && win) {
      contextCollector = new ContextCollector(win)
    }

    if (contextCollector) {
      return await contextCollector.collectFullContext(userAction)
    }

    return null
  } catch (error) {
    console.error('Failed to get full context:', error)
    return null
  }
})

// File system handlers
ipcMain.handle('show-save-dialog', async (_, options) => {
  try {
    if (!win) {
      return { canceled: true }
    }

    const result = await dialog.showSaveDialog(win, options)
    return result
  } catch (error) {
    console.error('Failed to show save dialog:', error)
    return { canceled: true, error: error.message }
  }
})

ipcMain.handle('write-file', async (_, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf8')
    return { success: true }
  } catch (error) {
    console.error('Failed to write file:', error)
    return { success: false, error: error.message }
  }
})

// Cleanup on app quit
app.on('before-quit', () => {
  if (globalRecorder) {
    globalRecorder.cleanup()
    globalRecorder = null
  }

  screenCaptureManager = null
})