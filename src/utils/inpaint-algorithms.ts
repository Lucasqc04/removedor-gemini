// Algoritmos de inpainting
// Algoritmos de inpainting
export type InpaintAlgorithm =
  | 'diffusion'
  | 'patchmatch'
  | 'borderclone'
  | 'telea'

export interface InpaintOptions {
  expand: number
  iterations: number
  algorithm: InpaintAlgorithm
  maskType?: 'rect' | 'gemini'
  // callback opcional para reportar progresso (0..100)
  onProgress?: (percent: number, message?: string) => void

  // Pós-processamento / blending
  smoothing?: 'none' | 'gaussian' | 'bilateral'
  smoothingAmount?: number // sigma approximation for gaussian or kernel size
  gradientBlend?: boolean
  blendStrength?: number // 0..1
  // Exemplar-plus specific
  gradientWeight?: number
}

export * from './inpaint-diffusion'
export * from './inpaint-patchmatch'
export * from './inpaint-borderclone'
export * from './inpaint-telea'
// nota: implementações exemplar/exemplar-plus removidas do pipeline
