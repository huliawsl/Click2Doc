import { BrowserWindow, screen, globalShortcut } from 'electron'
import { ScreenCaptureManager, CaptureOptions } from './screen-capture'
import { ContextCollector, OperationContext } from './context-collector'

export interface RecordedEvent {
  id: string
  timestamp: number
  type: 'mouse' | 'keyboard' | 'window' | 'application'
  action: string
  description: string
  screenshot?: string
  position?: { x: number; y: number }
  windowInfo?: {
    title: string
    bounds: { x: number; y: number; width: number; height: number }
    processName?: string
  }
  context?: OperationContext
  metadata?: Record<string, any>
}

export class GlobalRecorder {
  private isRecording = false
  private events: RecordedEvent[] = []
  private mainWindow: BrowserWindow | null = null
  private screenshotInterval: NodeJS.Timeout | null = null
  private screenCapture: ScreenCaptureManager
  private contextCollector: ContextCollector

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.screenCapture = new ScreenCaptureManager()
    this.contextCollector = new ContextCollector(mainWindow)
  }

  async startRecording(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.isRecording) {
        return { success: false, message: 'Recording already in progress' }
      }

      this.isRecording = true
      this.events = []

      // Register global shortcuts for demonstration
      this.registerGlobalShortcuts()

      // Start periodic screenshot capture (every 5 seconds when recording)
      this.startPeriodicScreenshots()

      // Simulate some global event monitoring
      this.simulateGlobalEvents()

      return { success: true, message: 'Global recording started successfully' }
    } catch (error) {
      console.error('Failed to start global recording:', error)
      return { success: false, message: `Failed to start recording: ${error.message}` }
    }
  }

  async stopRecording(): Promise<{ success: boolean; data?: RecordedEvent[]; message: string }> {
    try {
      if (!this.isRecording) {
        return { success: false, message: 'No recording in progress' }
      }

      this.isRecording = false

      // Unregister global shortcuts
      globalShortcut.unregisterAll()

      // Stop periodic screenshots
      if (this.screenshotInterval) {
        clearInterval(this.screenshotInterval)
        this.screenshotInterval = null
      }

      const recordedData = [...this.events]
      this.events = []

      return {
        success: true,
        data: recordedData,
        message: `Recording stopped. Captured ${recordedData.length} events.`
      }
    } catch (error) {
      console.error('Failed to stop global recording:', error)
      return { success: false, message: `Failed to stop recording: ${error.message}` }
    }
  }

  async captureScreenshot(): Promise<{ success: boolean; screenshot?: string; message?: string }> {
    try {
      const result = await this.screenCapture.captureScreen({
        quality: 'high',
        format: 'png'
      })

      if (result.success && result.screenshot) {
        return {
          success: true,
          screenshot: result.screenshot
        }
      }

      return { success: false, message: result.error || 'Screenshot capture failed' }
    } catch (error) {
      console.error('Screenshot capture failed:', error)
      return { success: false, message: `Screenshot failed: ${error.message}` }
    }
  }

  async getActiveWindowInfo(): Promise<{ success: boolean; windowInfo?: any; message?: string }> {
    try {
      const displays = screen.getAllDisplays()
      const primaryDisplay = screen.getPrimaryDisplay()
      const cursorPosition = screen.getCursorScreenPoint()

      return {
        success: true,
        windowInfo: {
          title: 'Active Window',
          bounds: primaryDisplay.bounds,
          cursorPosition,
          displays: displays.map(d => ({
            id: d.id,
            bounds: d.bounds,
            workArea: d.workArea,
            scaleFactor: d.scaleFactor
          }))
        }
      }
    } catch (error) {
      console.error('Failed to get window info:', error)
      return { success: false, message: `Window info failed: ${error.message}` }
    }
  }

  private registerGlobalShortcuts() {
    // Register some global shortcuts for demonstration
    globalShortcut.register('CommandOrControl+Shift+R', () => {
      this.recordEvent('keyboard', 'Global shortcut pressed', 'CommandOrControl+Shift+R')
    })

    globalShortcut.register('CommandOrControl+Shift+S', () => {
      this.recordEvent('keyboard', 'Screenshot shortcut pressed', 'CommandOrControl+Shift+S')
      this.captureAndRecordScreenshot()
    })
  }

  private startPeriodicScreenshots() {
    // Capture a screenshot every 10 seconds during recording
    this.screenshotInterval = setInterval(() => {
      if (this.isRecording) {
        this.captureAndRecordScreenshot()
      }
    }, 10000)
  }

  private async captureAndRecordScreenshot() {
    try {
      const result = await this.captureScreenshot()
      if (result.success && result.screenshot) {
        this.recordEvent('application', 'Periodic screenshot', 'Automatic screenshot capture', undefined, result.screenshot)
      }
    } catch (error) {
      console.error('Failed to capture periodic screenshot:', error)
    }
  }

  private simulateGlobalEvents() {
    // This is a simulation - in a real implementation, you would use native hooks
    // For demonstration, we'll generate some sample events
    if (!this.isRecording) return

    setTimeout(() => {
      if (this.isRecording) {
        this.recordEvent('mouse', 'Mouse click simulation', 'Left click at random position', {
          x: Math.floor(Math.random() * 1920),
          y: Math.floor(Math.random() * 1080)
        })
      }
    }, 3000)

    setTimeout(() => {
      if (this.isRecording) {
        this.recordEvent('keyboard', 'Keyboard input simulation', 'Text input detected')
      }
    }, 6000)
  }

  private async recordEvent(
    type: RecordedEvent['type'],
    action: string,
    description: string,
    position?: { x: number; y: number },
    screenshot?: string
  ) {
    if (!this.isRecording) return

    try {
      // Capture screenshot if not provided
      if (!screenshot) {
        const screenshotResult = await this.captureScreenshot()
        if (screenshotResult.success) {
          screenshot = screenshotResult.screenshot
        }
      }

      // Collect full context information
      const context = await this.contextCollector.collectFullContext({
        type: type === 'mouse' ? 'mouse' : type === 'keyboard' ? 'keyboard' : 'window',
        details: {
          action,
          description,
          position,
          timestamp: Date.now()
        }
      })

      // Get window info (legacy support)
      const windowInfoResult = await this.getActiveWindowInfo()
      const windowInfo = windowInfoResult.success ? windowInfoResult.windowInfo : undefined

      const event: RecordedEvent = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
        timestamp: Date.now(),
        type,
        action,
        description,
        screenshot,
        position,
        windowInfo,
        context,
        metadata: {
          recordingSession: Date.now(),
          platform: process.platform,
          contextCollected: true,
          systemInfo: {
            memory: context.system.freeMemory,
            cpu: context.system.cpuCount,
            displays: context.system.displays.length
          }
        }
      }

      this.events.push(event)

      // Send event to renderer process
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('global-event-captured', event)
      }

      console.log(`Recorded ${type} event: ${description}`)
      console.log(`Context: Window="${context.window.title}", App="${context.application.name}"`)
    } catch (error) {
      console.error('Failed to record event:', error)
    }
  }

  // Cleanup method
  cleanup() {
    if (this.isRecording) {
      this.stopRecording()
    }
    
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval)
      this.screenshotInterval = null
    }
    
    globalShortcut.unregisterAll()
  }
}
