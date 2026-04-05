import type { SelectionRect } from '../types'
import type { InpaintOptions } from './inpaint-algorithms'
import { clamp } from './geometry'
import { createGeminiMask } from './gemini-mask'

export async function removeSelectionPatchMatch(
  image: HTMLImageElement,
  selection: SelectionRect,
  options: InpaintOptions & { maskType?: 'rect' | 'gemini' },
): Promise<string> {
  try {
  // PatchMatch simplificado: copia blocos aleatórios da borda para dentro da seleção
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    if (!width || !height) throw new Error('Imagem sem dimensões')

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

    const { x, y, width: w, height: h } = selection
    if (w <= 0 || h <= 0) throw new Error('Seleção inválida')
    const patchSize = 7
    // Máscara Gemini
    let mask: boolean[][] | null = null
    if (options.maskType === 'gemini') {
      mask = createGeminiMask(w, h)
    }

  function copyPatch(sx: number, sy: number, dx: number, dy: number) {
    for (let py = 0; py < patchSize; py++) {
      for (let px = 0; px < patchSize; px++) {
        const srcX = sx + px
        const srcY = sy + py
        const dstX = dx + px
        const dstY = dy + py
        // Só copia se dentro da seleção e, se máscara Gemini, só se for true
        if (
          srcX < 0 || srcX >= width || srcY < 0 || srcY >= height ||
          dstX < x || dstX >= x + w || dstY < y || dstY >= y + h
        ) continue
        if (mask && !mask[dstY - y]?.[dstX - x]) continue
        const srcIdx = (srcY * width + srcX) * 4
        const dstIdx = (dstY * width + dstX) * 4
        data[dstIdx] = data[srcIdx]
        data[dstIdx + 1] = data[srcIdx + 1]
        data[dstIdx + 2] = data[srcIdx + 2]
        data[dstIdx + 3] = 255
      }
    }
  }

    for (let iter = 0; iter < options.iterations; iter++) {
      // report progress ocasional
      try {
        if (iter % Math.max(1, Math.floor(options.iterations / 10)) === 0) {
          options.onProgress?.(Math.round(5 + (iter / options.iterations) * 90), `PatchMatch: iter ${iter + 1}/${options.iterations}`)
        }
      } catch (e) {
        // ignore
      }
      for (let iy = y; iy < y + h; iy += patchSize) {
        for (let ix = x; ix < x + w; ix += patchSize) {
          let bx = x - patchSize
          let by = iy
          if (Math.random() < 0.5) {
            bx = x + w
          }
          by = clamp(by, 0, height - patchSize)
          bx = clamp(bx, 0, width - patchSize)
          if (Math.random() < 0.5) {
            by = y - patchSize
            bx = ix
            if (Math.random() < 0.5) {
              by = y + h
            }
            bx = clamp(bx, 0, width - patchSize)
            by = clamp(by, 0, height - patchSize)
          }
          bx += Math.floor((Math.random() - 0.5) * 6)
          by += Math.floor((Math.random() - 0.5) * 6)
          try {
            copyPatch(bx, by, ix, iy)
          } catch (err) {
            // Log de erro de patch
            // eslint-disable-next-line no-console
            console.error('Erro PatchMatch:', err, { bx, by, ix, iy, width, height, w, h })
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL('image/png')
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('PatchMatch falhou:', err)
    throw err
  }
}
