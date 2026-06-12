export interface ProcessedImage {
  base64: string
  mimeType: string
  fileName: string
  bytes: number
  width: number
  height: number
}

interface ImageProcessingOptions {
  maxInputBytes?: number
  maxOutputBytes?: number
  maxDimension?: number
}

const DEFAULT_MAX_INPUT_BYTES = 10 * 1024 * 1024
const DEFAULT_MAX_OUTPUT_BYTES = 1.5 * 1024 * 1024
const DEFAULT_MAX_DIMENSION = 1600

export async function processImageFile(file: File, options: ImageProcessingOptions = {}): Promise<ProcessedImage> {
  const maxInputBytes = options.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION

  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.')
  }
  if (file.size > maxInputBytes) {
    throw new Error(`Image is larger than ${Math.round(maxInputBytes / (1024 * 1024))}MB.`)
  }

  const imageElement = await loadImage(file)
  const { width, height } = fitDimensions(imageElement.width, imageElement.height, maxDimension)
  const canvas = drawToCanvas(imageElement, width, height)
  const blob = await compressImage(canvas, maxOutputBytes, file.type)
  const base64 = await blobToBase64(blob)

  return {
    base64,
    mimeType: blob.type,
    fileName: file.name,
    bytes: blob.size,
    width,
    height,
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to read image file.'))
    }
    image.src = objectUrl
  })
}

function fitDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height }
  }
  const scale = Math.min(maxDimension / width, maxDimension / height)
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

function drawToCanvas(image: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to initialize canvas context.')
  }
  context.drawImage(image, 0, 0, width, height)
  return canvas
}

async function compressImage(canvas: HTMLCanvasElement, maxBytes: number, originalType: string): Promise<Blob> {
  const targetType = originalType === 'image/png' ? 'image/png' : 'image/jpeg'

  let quality = 0.9
  let candidate = await canvasToBlob(canvas, targetType, quality)

  while (candidate.size > maxBytes && quality > 0.45 && targetType === 'image/jpeg') {
    quality -= 0.1
    candidate = await canvasToBlob(canvas, targetType, quality)
  }

  if (candidate.size > maxBytes) {
    throw new Error('Image is still too large after compression.')
  }

  return candidate
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode image.'))
          return
        }
        resolve(blob)
      },
      type,
      quality,
    )
  })
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new Error('Failed to convert image to base64.'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read encoded image.'))
    reader.readAsDataURL(blob)
  })
}
