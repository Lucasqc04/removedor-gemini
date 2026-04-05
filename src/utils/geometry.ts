import type { Corner, RelativeSize, SelectionRect } from '../types'

const MIN_BOX_SIZE = 18

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function normalizeSelection(
  selection: SelectionRect,
  imageWidth: number,
  imageHeight: number,
): SelectionRect {
  const width = clamp(Math.round(selection.width), MIN_BOX_SIZE, imageWidth)
  const height = clamp(Math.round(selection.height), MIN_BOX_SIZE, imageHeight)
  const x = clamp(Math.round(selection.x), 0, imageWidth - width)
  const y = clamp(Math.round(selection.y), 0, imageHeight - height)

  return { x, y, width, height }
}

export function createCornerSelection(
  imageWidth: number,
  imageHeight: number,
  corner: Corner,
  size: RelativeSize,
  margin = 10,
): SelectionRect {
  const width = clamp(
    Math.round((imageWidth * size.widthPercent) / 100),
    MIN_BOX_SIZE,
    imageWidth,
  )
  const height = clamp(
    Math.round((imageHeight * size.heightPercent) / 100),
    MIN_BOX_SIZE,
    imageHeight,
  )

  const x = corner.endsWith('right')
    ? imageWidth - width - margin
    : margin

  const y = corner.startsWith('bottom')
    ? imageHeight - height - margin
    : margin

  return normalizeSelection({ x, y, width, height }, imageWidth, imageHeight)
}

export function superellipsePoints(
  n = 1.3, // mantido por compatibilidade
  steps = 240,
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = []

  // Referencia `n` para compatibilidade com chamadas antigas (evita TS6133)
  void n

const pinch = 0.48
const pointiness = 5.6

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2

    const c = Math.cos(t)
    const s = Math.sin(t)

    // força maior nos eixos (cima, direita, baixo, esquerda)
    const axisStrength = Math.max(Math.abs(c), Math.abs(s))

    // arredonda/transiciona melhor
    const shapedAxis = Math.pow(axisStrength, pointiness)

    // faz o raio ficar maior nas pontas e menor nas diagonais
    const r = 1 - pinch + pinch * shapedAxis

    pts.push({
      x: r * c,
      y: r * s,
    })
  }

  return pts
}