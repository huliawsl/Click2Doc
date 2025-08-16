import { BrowserWindow, screen, app } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'

const execAsync = promisify(exec)

export interface WindowContext {
  title: string
  processName: string
  processId: number
  bounds: { x: number; y: number; width: number; height: number }
  isVisible: boolean
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
}

export interface ApplicationContext {
  name: string
  version?: string
  path?: string
  processId: number
  memoryUsage?: number
  cpuUsage?: number
}

export interface SystemContext {
  platform: string
  architecture: string
  totalMemory: number
  freeMemory: number
  cpuCount: number
  uptime: number
  displays: Array<{
    id: number
    bounds: { x: number; y: number; width: number; height: number }
    workArea: { x: number; y: number; width: number; height: number }
    scaleFactor: number
    rotation: number
  }>
  cursorPosition: { x: number; y: number }
}

export interface WebPageContext {
  url?: string
  title?: string
  domain?: string
  elements?: Array<{
    tagName: string
    id?: string
    className?: string
    text?: string
    bounds?: { x: number; y: number; width: number; height: number }
  }>
}

export interface OperationContext {
  timestamp: number
  window: WindowContext
  application: ApplicationContext
  system: SystemContext
  webpage?: WebPageContext
  userAction: {
    type: 'mouse' | 'keyboard' | 'scroll' | 'window'
    details: any
  }
}

export class ContextCollector {
  private mainWindow: BrowserWindow | null = null

  constructor(mainWindow?: BrowserWindow) {
    this.mainWindow = mainWindow || null
  }

  async collectFullContext(userAction: OperationContext['userAction']): Promise<OperationContext> {
    const [windowContext, applicationContext, systemContext, webPageContext] = await Promise.all([
      this.getActiveWindowContext(),
      this.getApplicationContext(),
      this.getSystemContext(),
      this.getWebPageContext()
    ])

    return {
      timestamp: Date.now(),
      window: windowContext,
      application: applicationContext,
      system: systemContext,
      webpage: webPageContext,
      userAction
    }
  }

  async getActiveWindowContext(): Promise<WindowContext> {
    try {
      // This is a simplified implementation
      // In a real application, you would use native APIs to get the actual active window
      
      if (process.platform === 'win32') {
        return await this.getWindowsActiveWindow()
      } else if (process.platform === 'darwin') {
        return await this.getMacActiveWindow()
      } else {
        return await this.getLinuxActiveWindow()
      }
    } catch (error) {
      console.error('Failed to get active window context:', error)
      return this.getDefaultWindowContext()
    }
  }

  private async getWindowsActiveWindow(): Promise<WindowContext> {
    try {
      // Use PowerShell to get active window information
      const { stdout } = await execAsync(`
        powershell -Command "
        Add-Type -AssemblyName System.Windows.Forms;
        $activeWindow = [System.Windows.Forms.Form]::ActiveForm;
        if ($activeWindow) {
          Write-Output $activeWindow.Text;
          Write-Output $activeWindow.Bounds.X;
          Write-Output $activeWindow.Bounds.Y;
          Write-Output $activeWindow.Bounds.Width;
          Write-Output $activeWindow.Bounds.Height;
        } else {
          Write-Output 'Unknown Window';
          Write-Output '0';
          Write-Output '0';
          Write-Output '800';
          Write-Output '600';
        }
        "
      `)

      const lines = stdout.trim().split('\n')
      return {
        title: lines[0] || 'Unknown Window',
        processName: 'Unknown Process',
        processId: 0,
        bounds: {
          x: parseInt(lines[1]) || 0,
          y: parseInt(lines[2]) || 0,
          width: parseInt(lines[3]) || 800,
          height: parseInt(lines[4]) || 600
        },
        isVisible: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: 0
      }
    } catch (error) {
      console.error('Windows active window detection failed:', error)
      return this.getDefaultWindowContext()
    }
  }

  private async getMacActiveWindow(): Promise<WindowContext> {
    try {
      // Use AppleScript to get active window information
      const { stdout } = await execAsync(`
        osascript -e '
        tell application "System Events"
          set frontApp to first application process whose frontmost is true
          set frontAppName to name of frontApp
          set frontWindow to first window of frontApp
          set windowTitle to name of frontWindow
          set windowBounds to position of frontWindow
          set windowSize to size of frontWindow
          return frontAppName & "|" & windowTitle & "|" & (item 1 of windowBounds) & "|" & (item 2 of windowBounds) & "|" & (item 1 of windowSize) & "|" & (item 2 of windowSize)
        end tell
        '
      `)

      const parts = stdout.trim().split('|')
      return {
        title: parts[1] || 'Unknown Window',
        processName: parts[0] || 'Unknown Process',
        processId: 0,
        bounds: {
          x: parseInt(parts[2]) || 0,
          y: parseInt(parts[3]) || 0,
          width: parseInt(parts[4]) || 800,
          height: parseInt(parts[5]) || 600
        },
        isVisible: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: 0
      }
    } catch (error) {
      console.error('macOS active window detection failed:', error)
      return this.getDefaultWindowContext()
    }
  }

  private async getLinuxActiveWindow(): Promise<WindowContext> {
    try {
      // Use xdotool or wmctrl to get active window information
      const { stdout } = await execAsync('xdotool getactivewindow getwindowname')
      const title = stdout.trim()

      const { stdout: geometryOutput } = await execAsync('xdotool getactivewindow getwindowgeometry')
      const geometryMatch = geometryOutput.match(/Position: (\d+),(\d+).*Geometry: (\d+)x(\d+)/)

      return {
        title: title || 'Unknown Window',
        processName: 'Unknown Process',
        processId: 0,
        bounds: {
          x: geometryMatch ? parseInt(geometryMatch[1]) : 0,
          y: geometryMatch ? parseInt(geometryMatch[2]) : 0,
          width: geometryMatch ? parseInt(geometryMatch[3]) : 800,
          height: geometryMatch ? parseInt(geometryMatch[4]) : 600
        },
        isVisible: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: 0
      }
    } catch (error) {
      console.error('Linux active window detection failed:', error)
      return this.getDefaultWindowContext()
    }
  }

  private getDefaultWindowContext(): WindowContext {
    const primaryDisplay = screen.getPrimaryDisplay()
    return {
      title: 'Unknown Window',
      processName: 'Unknown Process',
      processId: 0,
      bounds: {
        x: 0,
        y: 0,
        width: primaryDisplay.bounds.width,
        height: primaryDisplay.bounds.height
      },
      isVisible: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: 0
    }
  }

  async getApplicationContext(): Promise<ApplicationContext> {
    try {
      const appName = app.getName()
      const appVersion = app.getVersion()
      const appPath = app.getAppPath()

      return {
        name: appName,
        version: appVersion,
        path: appPath,
        processId: process.pid,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user
      }
    } catch (error) {
      console.error('Failed to get application context:', error)
      return {
        name: 'Unknown Application',
        processId: process.pid
      }
    }
  }

  async getSystemContext(): Promise<SystemContext> {
    try {
      const displays = screen.getAllDisplays()
      const cursorPosition = screen.getCursorScreenPoint()

      return {
        platform: process.platform,
        architecture: process.arch,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length,
        uptime: os.uptime(),
        displays: displays.map(display => ({
          id: display.id,
          bounds: display.bounds,
          workArea: display.workArea,
          scaleFactor: display.scaleFactor,
          rotation: display.rotation
        })),
        cursorPosition
      }
    } catch (error) {
      console.error('Failed to get system context:', error)
      return {
        platform: process.platform,
        architecture: process.arch,
        totalMemory: 0,
        freeMemory: 0,
        cpuCount: 1,
        uptime: 0,
        displays: [],
        cursorPosition: { x: 0, y: 0 }
      }
    }
  }

  async getWebPageContext(): Promise<WebPageContext | undefined> {
    try {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        return undefined
      }

      // Get web page context from the renderer process
      const webContents = this.mainWindow.webContents
      const url = webContents.getURL()
      const title = webContents.getTitle()

      // Extract domain from URL
      let domain: string | undefined
      try {
        domain = new URL(url).hostname
      } catch {
        domain = undefined
      }

      return {
        url,
        title,
        domain,
        elements: [] // This would be populated by the renderer process
      }
    } catch (error) {
      console.error('Failed to get web page context:', error)
      return undefined
    }
  }

  // Method to collect DOM elements from the renderer process
  async collectDOMElements(): Promise<WebPageContext['elements']> {
    try {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        return []
      }

      // This would be implemented by sending a message to the renderer process
      // to collect DOM element information
      return []
    } catch (error) {
      console.error('Failed to collect DOM elements:', error)
      return []
    }
  }
}
