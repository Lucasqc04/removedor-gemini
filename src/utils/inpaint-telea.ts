import type { SelectionRect } from '../types'
import type { InpaintOptions } from './inpaint-algorithms'
import { normalizeSelection } from './geometry'
import { createGeminiMask } from './gemini-mask'

export async function removeSelectionTelea(
  image: HTMLImageElement,
  rawSelection: SelectionRect,
  options: InpaintOptions,
): Promise<string> {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height

  const selection = normalizeSelection(rawSelection, width, height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Contexto 2D indisponivel')

  ctx.drawImage(image, 0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const pixelCount = width * height
  const filled = new Uint8Array(pixelCount) // 1 = known/filled, 0 = unknown
  const inQueue = new Uint8Array(pixelCount)

  // se maskType === 'gemini', apenas os pixels dentro da máscara são considerados "unknown"
  const useGemini = options.maskType === 'gemini'
  const geminiMask = useGemini ? createGeminiMask(selection.width, selection.height) : null

  for (let yy = 0; yy < height; yy++) {
    for (let xx = 0; xx < width; xx++) {
      const idx = yy * width + xx
      // fora do retângulo de seleção -> conhecido
      if (
        xx < selection.x ||
        xx >= selection.x + selection.width ||
        yy < selection.y ||
        yy >= selection.y + selection.height
      ) {
        filled[idx] = 1
        continue
      }

      // dentro do retângulo de seleção: se usamos gemini, e o pixel NÃO faz parte
      // da máscara, trata como conhecido (não é alvo do inpaint)
      if (geminiMask) {
        const mx = xx - selection.x
        const my = yy - selection.y
        if (!geminiMask[my]?.[mx]) {
          filled[idx] = 1
        }
      }
      // caso contrário, permanece 0 (unknown) e será preenchido
    }
  }

  const queue: number[] = []

  // Enfileira fronteira (pixels dentro da seleção que tocam um pixel conhecido)
  for (let yy = selection.y; yy < selection.y + selection.height; yy++) {
    for (let xx = selection.x; xx < selection.x + selection.width; xx++) {
      // se usamos gemini e o pixel não é parte da máscara, pule
      if (geminiMask && !geminiMask[yy - selection.y]?.[xx - selection.x]) continue

      const i = yy * width + xx
      let isBoundary = false
      for (let oy = -1; oy <= 1 && !isBoundary; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const nx = xx + ox
          const ny = yy + oy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const ni = ny * width + nx
          if (filled[ni]) {
            isBoundary = true
            break
          }
        }
      }
      if (isBoundary) {
        queue.push(i)
        inQueue[i] = 1
      }
    }
  }

  // Preenchimento em largura (Telea-like): usa índice para evitar shift O(n)
  let qi = 0
  const initialQueueLen = queue.length
  let processed = 0
  const REPORT_EVERY = Math.max(1, Math.floor(initialQueueLen / 40))

  while (qi < queue.length) {
    const idx = queue[qi++]
    if (filled[idx]) continue

    const cx = idx % width
    const cy = Math.floor(idx / width)

    let sumR = 0
    let sumG = 0
    let sumB = 0
    let sumW = 0

    for (let oy = -1; oy <= 1; oy++) {
      const ny = cy + oy
      if (ny < 0 || ny >= height) continue
      for (let ox = -1; ox <= 1; ox++) {
        const nx = cx + ox
        if (nx < 0 || nx >= width) continue
        const nidx = ny * width + nx
        if (!filled[nidx]) continue

        const offset = nidx * 4
        const r = data[offset]
        const g = data[offset + 1]
        const b = data[offset + 2]

        const dx = nx - cx
        const dy = ny - cy
        const dist2 = dx * dx + dy * dy
        const w = 1 / (Math.sqrt(dist2) + 0.01)

        sumR += r * w
        sumG += g * w
        sumB += b * w
        sumW += w
      }
    }

    if (sumW > 0) {
      const off = idx * 4
      data[off] = Math.round(sumR / sumW)
      data[off + 1] = Math.round(sumG / sumW)
      data[off + 2] = Math.round(sumB / sumW)
      data[off + 3] = 255
      filled[idx] = 1

      // adiciona vizinhos desconhecidos à fila
      for (let oy = -1; oy <= 1; oy++) {
        const ny = cy + oy
        if (ny < 0 || ny >= height) continue
        for (let ox = -1; ox <= 1; ox++) {
          const nx = cx + ox
          if (nx < 0 || nx >= width) continue
          const nidx = ny * width + nx
          if (!filled[nidx] && !inQueue[nidx]) {
            inQueue[nidx] = 1
            queue.push(nidx)
          }
        }
      }

      processed++
      if (processed % REPORT_EVERY === 0) {
        try {
          options.onProgress?.(Math.round(5 + (processed / Math.max(1, initialQueueLen)) * 90), `Telea: ${processed}/${initialQueueLen}`)
        } catch (e) {
          // ignore
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)

  return canvas.toDataURL('image/png')
}
