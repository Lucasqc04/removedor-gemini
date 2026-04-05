// Gera uma máscara booleana no formato "gemini" (estrela arredondada)
// A máscara tem o mesmo tamanho da seleção (width x height)

export function createGeminiMask(width: number, height: number): boolean[][] {
  const mask: boolean[][] = []
  const cx = width / 2
  const cy = height / 2
  const rx = width / 2
  const ry = height / 2
  // Parâmetros para controlar o "bico" da estrela
  const k = 0.55 // quanto menor, mais "pontudo"
  for (let y = 0; y < height; y++) {
    mask[y] = []
    for (let x = 0; x < width; x++) {
      // Coordenadas normalizadas (-1 a 1)
      const nx = (x - cx) / rx
      const ny = (y - cy) / ry
      // Fórmula aproximada para shape "gemini"
      // 4 "pétalas" arredondadas
      const r = Math.sqrt(nx * nx + ny * ny)
      const theta = Math.atan2(ny, nx)
      // Modula o raio para criar as "pontas"
      const mod = 1 - k * Math.pow(Math.sin(2 * theta), 6)
      mask[y][x] = r <= mod
    }
  }
  return mask
}
