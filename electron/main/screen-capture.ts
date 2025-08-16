import { desktopCapturer, screen, nativeImage } from 'electron'

export interface CaptureOptions {
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  format?: 'png' | 'jpeg'
  includeAudio?: boolean
  captureArea?: {
    x: number
    y: number
    width: number
    height: number
  }
  annotations?: {
    highlights?: Array<{ x: number; y: number; width: number; height: number; color?: string }>
    arrows?: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; color?: string }>
    text?: Array<{ x: number; y: number; text: string; fontSize?: number; color?: string }>
  }
}

export interface CaptureResult {
  success: boolean
  screenshot?: string
  metadata?: {
    timestamp: number
    dimensions: { width: number; height: number }
    format: string
    quality: string
    fileSize: number
    displays: Array<{
      id: number
      bounds: { x: number; y: number; width: number; height: number }
      scaleFactor: number
    }>
  }
  error?: string
}

export class ScreenCaptureManager {
  private qualitySettings = {
    low: { width: 800, height: 600, quality: 60 },
    medium: { width: 1280, height: 720, quality: 75 },
    high: { width: 1920, height: 1080, quality: 85 },
    ultra: { width: 3840, height: 2160, quality: 95 }
  }

  async captureScreen(options: CaptureOptions = {}): Promise<CaptureResult> {
    try {
      const {
        quality = 'high',
        format = 'png',
        captureArea,
        annotations
      } = options

      // Get screen sources
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: this.qualitySettings[quality]
      })

      if (sources.length === 0) {
        return {
          success: false,
          error: 'No screen sources available'
        }
      }

      // Use the primary screen source
      const primarySource = sources[0]
      let screenshot = primarySource.thumbnail

      // Apply capture area if specified
      if (captureArea) {
        screenshot = this.cropImage(screenshot, captureArea)
      }

      // Apply annotations if specified
      if (annotations) {
        screenshot = await this.addAnnotations(screenshot, annotations)
      }

      // Convert to desired format
      const screenshotData = format === 'jpeg' 
        ? screenshot.toJPEG(this.qualitySettings[quality].quality)
        : screenshot.toPNG()

      const dataUrl = `data:image/${format};base64,${screenshotData.toString('base64')}`

      // Get display information
      const displays = screen.getAllDisplays()

      return {
        success: true,
        screenshot: dataUrl,
        metadata: {
          timestamp: Date.now(),
          dimensions: {
            width: screenshot.getSize().width,
            height: screenshot.getSize().height
          },
          format,
          quality,
          fileSize: screenshotData.length,
          displays: displays.map(d => ({
            id: d.id,
            bounds: d.bounds,
            scaleFactor: d.scaleFactor
          }))
        }
      }
    } catch (error) {
      console.error('Screen capture failed:', error)
      return {
        success: false,
        error: `Screen capture failed: ${error.message}`
      }
    }
  }

  async captureWindow(windowId?: number): Promise<CaptureResult> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: this.qualitySettings.high
      })

      if (sources.length === 0) {
        return {
          success: false,
          error: 'No window sources available'
        }
      }

      // Find specific window or use the first one
      const windowSource = windowId 
        ? sources.find(s => s.id.includes(windowId.toString()))
        : sources[0]

      if (!windowSource) {
        return {
          success: false,
          error: 'Specified window not found'
        }
      }

      const screenshot = windowSource.thumbnail
      const screenshotData = screenshot.toPNG()
      const dataUrl = `data:image/png;base64,${screenshotData.toString('base64')}`

      return {
        success: true,
        screenshot: dataUrl,
        metadata: {
          timestamp: Date.now(),
          dimensions: {
            width: screenshot.getSize().width,
            height: screenshot.getSize().height
          },
          format: 'png',
          quality: 'high',
          fileSize: screenshotData.length,
          displays: []
        }
      }
    } catch (error) {
      console.error('Window capture failed:', error)
      return {
        success: false,
        error: `Window capture failed: ${error.message}`
      }
    }
  }

  async captureRegion(region: { x: number; y: number; width: number; height: number }): Promise<CaptureResult> {
    const fullScreenResult = await this.captureScreen({ quality: 'ultra' })
    
    if (!fullScreenResult.success || !fullScreenResult.screenshot) {
      return fullScreenResult
    }

    try {
      // Convert base64 to buffer
      const base64Data = fullScreenResult.screenshot.split(',')[1]
      const imageBuffer = Buffer.from(base64Data, 'base64')
      const image = nativeImage.createFromBuffer(imageBuffer)

      // Crop the image
      const croppedImage = this.cropImage(image, region)
      const croppedData = croppedImage.toPNG()
      const dataUrl = `data:image/png;base64,${croppedData.toString('base64')}`

      return {
        success: true,
        screenshot: dataUrl,
        metadata: {
          timestamp: Date.now(),
          dimensions: {
            width: region.width,
            height: region.height
          },
          format: 'png',
          quality: 'ultra',
          fileSize: croppedData.length,
          displays: fullScreenResult.metadata?.displays || []
        }
      }
    } catch (error) {
      console.error('Region capture failed:', error)
      return {
        success: false,
        error: `Region capture failed: ${error.message}`
      }
    }
  }

  private cropImage(image: Electron.NativeImage, area: { x: number; y: number; width: number; height: number }): Electron.NativeImage {
    const { x, y, width, height } = area
    return image.crop({ x, y, width, height })
  }

  private async addAnnotations(image: Electron.NativeImage, annotations: NonNullable<CaptureOptions['annotations']>): Promise<Electron.NativeImage> {
    // This is a simplified implementation
    // In a real application, you would use a canvas or image processing library
    // to draw annotations on the image
    
    try {
      // For now, just return the original image
      // TODO: Implement actual annotation drawing using canvas or similar
      console.log('Annotations requested:', annotations)
      return image
    } catch (error) {
      console.error('Failed to add annotations:', error)
      return image
    }
  }

  async getAvailableSources(): Promise<{ screens: any[]; windows: any[] }> {
    try {
      const [screenSources, windowSources] = await Promise.all([
        desktopCapturer.getSources({ types: ['screen'] }),
        desktopCapturer.getSources({ types: ['window'] })
      ])

      return {
        screens: screenSources.map(source => ({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail.toDataURL()
        })),
        windows: windowSources.map(source => ({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail.toDataURL()
        }))
      }
    } catch (error) {
      console.error('Failed to get available sources:', error)
      return { screens: [], windows: [] }
    }
  }

  async startVideoRecording(options: CaptureOptions = {}): Promise<{ success: boolean; message: string }> {
    // Placeholder for video recording functionality
    // This would require additional implementation with media recording APIs
    console.log('Video recording requested with options:', options)
    return {
      success: false,
      message: 'Video recording not yet implemented'
    }
  }

  async stopVideoRecording(): Promise<{ success: boolean; videoData?: string; message: string }> {
    // Placeholder for stopping video recording
    return {
      success: false,
      message: 'Video recording not yet implemented'
    }
  }
}
