import type { SelectionRect } from '../types'
import type { InpaintOptions } from './inpaint-algorithms'

export async function removeSelectionBorderClone(
  image: HTMLImageElement,
  selection: SelectionRect,
  _options: InpaintOptions,
): Promise<string> {
  // Clone de Bordas: replica pixels da borda para dentro da seleção
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const { x, y, width: w, height: h } = selection
  const border = 8

  // Cima
  for (let iy = 0; iy < border; iy++) {
    for (let ix = 0; ix < w; ix++) {
      const srcIdx = ((y - 1) * width + (x + ix)) * 4
      const dstIdx = ((y + iy) * width + (x + ix)) * 4
      if (y - 1 >= 0 && y + iy < height) {
        data[dstIdx] = data[srcIdx]
        data[dstIdx + 1] = data[srcIdx + 1]
        data[dstIdx + 2] = data[srcIdx + 2]
        data[dstIdx + 3] = 255
      }
    }
  }
  // Baixo
  for (let iy = 0; iy < border; iy++) {
    for (let ix = 0; ix < w; ix++) {
      const srcIdx = ((y + h) * width + (x + ix)) * 4
      const dstIdx = ((y + h - iy - 1) * width + (x + ix)) * 4
      if (y + h < height && y + h - iy - 1 >= y) {
        data[dstIdx] = data[srcIdx]
        data[dstIdx + 1] = data[srcIdx + 1]
        data[dstIdx + 2] = data[srcIdx + 2]
        data[dstIdx + 3] = 255
      }
    }
  }
  // Esquerda
  for (let ix = 0; ix < border; ix++) {
    for (let iy = 0; iy < h; iy++) {
      const srcIdx = ((y + iy) * width + (x - 1)) * 4
      const dstIdx = ((y + iy) * width + (x + ix)) * 4
      if (x - 1 >= 0 && x + ix < x + w) {
        data[dstIdx] = data[srcIdx]
        data[dstIdx + 1] = data[srcIdx + 1]
        data[dstIdx + 2] = data[srcIdx + 2]
        data[dstIdx + 3] = 255
      }
    }
  }
  // Direita
  for (let ix = 0; ix < border; ix++) {
    for (let iy = 0; iy < h; iy++) {
      const srcIdx = ((y + iy) * width + (x + w) ) * 4
      const dstIdx = ((y + iy) * width + (x + w - ix - 1)) * 4
      if (x + w < width && x + w - ix - 1 >= x) {
        data[dstIdx] = data[srcIdx]
        data[dstIdx + 1] = data[srcIdx + 1]
        data[dstIdx + 2] = data[srcIdx + 2]
        data[dstIdx + 3] = 255
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}
