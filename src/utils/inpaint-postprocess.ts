import type { SelectionRect } from '../types'
import type { InpaintOptions } from './inpaint-algorithms'
import { loadImageFromURL } from './image'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function computeBlendStrength(
  x: number,
  y: number,
  core: SelectionRect,
  expand: number,
): number {
  const insideCore = x >= core.x && x <= core.x + core.width && y >= core.y && y <= core.y + core.height
  if (insideCore) return 1
  if (expand <= 0) return 0

  const dx = x < core.x ? core.x - x : x > core.x + core.width ? x - (core.x + core.width) : 0
  const dy = y < core.y ? core.y - y : y > core.y + core.height ? y - (core.y + core.height) : 0

  const dist = Math.max(dx, dy)
  const t = clamp(1 - dist / (expand + 1), 0, 1)
  return t * t
}

// separable gaussian blur on ImageData (in-place)
function gaussianBlur(imageData: ImageData, sigma: number) {
  if (sigma <= 0) return imageData
  const w = imageData.width
  const h = imageData.height
  const data = imageData.data

  const radius = Math.ceil(sigma * 2.5)
  const kernel: number[] = []
  let ksum = 0
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma))
    kernel.push(v)
    ksum += v
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= ksum

  const tmp = new Uint8ClampedArray(data.length)

  // horizontal pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0
      for (let k = -radius; k <= radius; k++) {
        const sx = clamp(x + k, 0, w - 1)
        const off = (y * w + sx) * 4
        const kv = kernel[k + radius]
        r += data[off] * kv
        g += data[off + 1] * kv
        b += data[off + 2] * kv
        a += data[off + 3] * kv
      }
      const o = (y * w + x) * 4
      tmp[o] = r
      tmp[o + 1] = g
      tmp[o + 2] = b
      tmp[o + 3] = a
    }
  }

  // vertical pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0
      for (let k = -radius; k <= radius; k++) {
        const sy = clamp(y + k, 0, h - 1)
        const off = (sy * w + x) * 4
        const kv = kernel[k + radius]
        r += tmp[off] * kv
        g += tmp[off + 1] * kv
        b += tmp[off + 2] * kv
        a += tmp[off + 3] * kv
      }
      const o = (y * w + x) * 4
      data[o] = Math.round(r)
      data[o + 1] = Math.round(g)
      data[o + 2] = Math.round(b)
      data[o + 3] = Math.round(a)
    }
  }

  return imageData
}

export async function applyPostprocess(
  original: HTMLImageElement,
  inpaintDataURL: string,
  selection: SelectionRect,
  options: InpaintOptions,
): Promise<string> {
  const width = original.naturalWidth || original.width
  const height = original.naturalHeight || original.height

  const origCanvas = document.createElement('canvas')
  origCanvas.width = width
  origCanvas.height = height
  const octx = origCanvas.getContext('2d')!
  octx.drawImage(original, 0, 0, width, height)
  const origData = octx.getImageData(0, 0, width, height)

  const inpaintImg = await loadImageFromURL(inpaintDataURL)
  const ic = document.createElement('canvas')
  ic.width = width
  ic.height = height
  const ictx = ic.getContext('2d')!
  ictx.drawImage(inpaintImg, 0, 0, width, height)
  let inData = ictx.getImageData(0, 0, width, height)

  // smoothing
  const smoothing = options.smoothing ?? 'none'
  const smoothingAmount = options.smoothingAmount ?? 0.9
  if (smoothing === 'gaussian' && smoothingAmount > 0) {
    inData = gaussianBlur(inData, smoothingAmount)
  }

  const result = octx.createImageData(width, height)
  const expand = options.expand ?? 0
  const blendStrength = options.blendStrength ?? 1

  // blend original <-> inpaint using falloff
  for (let yy = 0; yy < height; yy++) {
    for (let xx = 0; xx < width; xx++) {
      const i = (yy * width + xx) * 4
      const blend = computeBlendStrength(xx, yy, selection, expand) * blendStrength
      if (blend <= 0) {
        result.data[i] = origData.data[i]
        result.data[i + 1] = origData.data[i + 1]
        result.data[i + 2] = origData.data[i + 2]
        result.data[i + 3] = 255
      } else if (blend >= 1) {
        result.data[i] = inData.data[i]
        result.data[i + 1] = inData.data[i + 1]
        result.data[i + 2] = inData.data[i + 2]
        result.data[i + 3] = 255
      } else {
        result.data[i] = Math.round(origData.data[i] * (1 - blend) + inData.data[i] * blend)
        result.data[i + 1] = Math.round(origData.data[i + 1] * (1 - blend) + inData.data[i + 1] * blend)
        result.data[i + 2] = Math.round(origData.data[i + 2] * (1 - blend) + inData.data[i + 2] * blend)
        result.data[i + 3] = 255
      }
    }
  }

  octx.putImageData(result, 0, 0)
  return origCanvas.toDataURL('image/png')
}
