import type { SelectionRect } from '../types'
import { clamp, normalizeSelection } from './geometry'
import type { InpaintOptions } from './inpaint-algorithms'

function indexOf(x: number, y: number, width: number): number {
  return y * width + x
}

function computeBlendStrength(
  x: number,
  y: number,
  core: SelectionRect,
  expand: number,
): number {
  const insideCore =
    x >= core.x &&
    x <= core.x + core.width &&
    y >= core.y &&
    y <= core.y + core.height

  if (insideCore) {
    return 1
  }

  if (expand <= 0) {
    return 0
  }

  const dx = x < core.x
    ? core.x - x
    : x > core.x + core.width
      ? x - (core.x + core.width)
      : 0

  const dy = y < core.y
    ? core.y - y
    : y > core.y + core.height
      ? y - (core.y + core.height)
      : 0

  const dist = Math.max(dx, dy)
  const t = clamp(1 - dist / (expand + 1), 0, 1)
  return t * t
}

export async function removeSelectionDiffusion(
  image: HTMLImageElement,
  rawSelection: SelectionRect,
  options: InpaintOptions,
): Promise<string> {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height

  const selection = normalizeSelection(rawSelection, width, height)
  const expand = clamp(Math.round(options.expand), 0, 36)
  const iterations = clamp(Math.round(options.iterations), 40, 420)

  const coreX0 = selection.x
  const coreY0 = selection.y
  const coreX1 = selection.x + selection.width
  const coreY1 = selection.y + selection.height

  const areaX0 = Math.max(0, coreX0 - expand)
  const areaY0 = Math.max(0, coreY0 - expand)
  const areaX1 = Math.min(width - 1, coreX1 + expand)
  const areaY1 = Math.min(height - 1, coreY1 + expand)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Contexto 2D indisponivel para processar a imagem.')
  }

  context.drawImage(image, 0, 0, width, height)
  const imageData = context.getImageData(0, 0, width, height)
  const originalData = new Uint8ClampedArray(imageData.data)
  const pixels = imageData.data

  const pixelCount = width * height
  const mask = new Uint8Array(pixelCount)

  for (let y = areaY0; y <= areaY1; y += 1) {
    for (let x = areaX0; x <= areaX1; x += 1) {
      mask[indexOf(x, y, width)] = 1
    }
  }

  const channelsCurrent = [
    new Float32Array(pixelCount),
    new Float32Array(pixelCount),
    new Float32Array(pixelCount),
  ]
  const channelsNext = [
    new Float32Array(pixelCount),
    new Float32Array(pixelCount),
    new Float32Array(pixelCount),
  ]

  for (let i = 0; i < pixelCount; i += 1) {
    const offset = i * 4
    channelsCurrent[0][i] = pixels[offset]
    channelsCurrent[1][i] = pixels[offset + 1]
    channelsCurrent[2][i] = pixels[offset + 2]

    channelsNext[0][i] = channelsCurrent[0][i]
    channelsNext[1][i] = channelsCurrent[1][i]
    channelsNext[2][i] = channelsCurrent[2][i]
  }

  for (let step = 0; step < iterations; step += 1) {
    for (let y = areaY0; y <= areaY1; y += 1) {
      const yPrev = Math.max(0, y - 1)
      const yNext = Math.min(height - 1, y + 1)

      for (let x = areaX0; x <= areaX1; x += 1) {
        const idx = indexOf(x, y, width)
        if (mask[idx] === 0) {
          continue
        }

        const xPrev = Math.max(0, x - 1)
        const xNext = Math.min(width - 1, x + 1)

        const left = indexOf(xPrev, y, width)
        const right = indexOf(xNext, y, width)
        const top = indexOf(x, yPrev, width)
        const bottom = indexOf(x, yNext, width)

        channelsNext[0][idx] =
          (channelsCurrent[0][left] +
            channelsCurrent[0][right] +
            channelsCurrent[0][top] +
            channelsCurrent[0][bottom]) *
          0.25

        channelsNext[1][idx] =
          (channelsCurrent[1][left] +
            channelsCurrent[1][right] +
            channelsCurrent[1][top] +
            channelsCurrent[1][bottom]) *
          0.25

        channelsNext[2][idx] =
          (channelsCurrent[2][left] +
            channelsCurrent[2][right] +
            channelsCurrent[2][top] +
            channelsCurrent[2][bottom]) *
          0.25
      }
    }

    const swapR = channelsCurrent[0]
    channelsCurrent[0] = channelsNext[0]
    channelsNext[0] = swapR

    const swapG = channelsCurrent[1]
    channelsCurrent[1] = channelsNext[1]
    channelsNext[1] = swapG

    const swapB = channelsCurrent[2]
    channelsCurrent[2] = channelsNext[2]
    channelsNext[2] = swapB

    // report progress ocasional
    try {
      if (step % Math.max(1, Math.floor(iterations / 20)) === 0) {
        options.onProgress?.(Math.round(5 + (step / iterations) * 90), `Difusão: passo ${step + 1}/${iterations}`)
      }
    } catch (e) {
      // ignore
    }
  }

  for (let y = areaY0; y <= areaY1; y += 1) {
    for (let x = areaX0; x <= areaX1; x += 1) {
      const idx = indexOf(x, y, width)
      if (mask[idx] === 0) {
        continue
      }

      const blend = computeBlendStrength(x, y, selection, expand)
      if (blend <= 0) {
        continue
      }

      const offset = idx * 4

      const r = channelsCurrent[0][idx]
      const g = channelsCurrent[1][idx]
      const b = channelsCurrent[2][idx]

      pixels[offset] = Math.round(originalData[offset] * (1 - blend) + r * blend)
      pixels[offset + 1] = Math.round(
        originalData[offset + 1] * (1 - blend) + g * blend,
      )
      pixels[offset + 2] = Math.round(
        originalData[offset + 2] * (1 - blend) + b * blend,
      )
    }
  }

  context.putImageData(imageData, 0, 0)

  try {
    options.onProgress?.(100, 'Difusão: concluído')
  } catch (e) {
    // ignore
  }

  return canvas.toDataURL('image/png')
}
