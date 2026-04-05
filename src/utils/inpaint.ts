import type { SelectionRect } from '../types'

import type { InpaintOptions } from './inpaint-algorithms'
import { removeSelectionDiffusion } from './inpaint-diffusion'
import { removeSelectionPatchMatch } from './inpaint-patchmatch'
import { removeSelectionBorderClone } from './inpaint-borderclone'
import { removeSelectionTelea } from './inpaint-telea'
import { applyPostprocess } from './inpaint-postprocess'



export async function removeSelectionFromImage(
  image: HTMLImageElement,
  selection: SelectionRect,
  options: InpaintOptions,
): Promise<string> {
  // define opções efetivas e defaults simples para pós-processamento
  const effectiveOptions: InpaintOptions = { ...options }
  if (!effectiveOptions.smoothing) {
    if (effectiveOptions.algorithm === 'telea') {
      effectiveOptions.smoothing = 'gaussian'
      effectiveOptions.smoothingAmount = effectiveOptions.smoothingAmount ?? 1.2
      effectiveOptions.gradientBlend = effectiveOptions.gradientBlend ?? true
      effectiveOptions.blendStrength = effectiveOptions.blendStrength ?? 1
    } else {
      effectiveOptions.smoothing = effectiveOptions.smoothing ?? 'none'
    }
  }

  let result = ''
  // log de inicio para diagnostico e medição de tempo
  // usa effectiveOptions para incluir defaults e callbacks
  // eslint-disable-next-line no-console
  console.info('[inpaint] start', effectiveOptions.algorithm)
  // eslint-disable-next-line no-console
  console.time(`[inpaint:${effectiveOptions.algorithm}]`)

  switch (effectiveOptions.algorithm) {
    case 'diffusion':
      result = await removeSelectionDiffusion(image, selection, effectiveOptions)
      break
    case 'patchmatch':
      result = await removeSelectionPatchMatch(image, selection, effectiveOptions)
      break
    case 'borderclone':
      result = await removeSelectionBorderClone(image, selection, effectiveOptions)
      break
    case 'telea':
      result = await removeSelectionTelea(image, selection, effectiveOptions)
      break
    default:
      throw new Error('Algoritmo de inpainting desconhecido')
  }

  // eslint-disable-next-line no-console
  console.timeEnd(`[inpaint:${effectiveOptions.algorithm}]`)
  // eslint-disable-next-line no-console
  console.info('[inpaint] finished', effectiveOptions.algorithm)

  // aplicar pós-processamento leve (ex.: blur + blend com original)
  if ((effectiveOptions.smoothing && effectiveOptions.smoothing !== 'none') || effectiveOptions.gradientBlend) {
    try {
      const processed = await applyPostprocess(image, result, selection, effectiveOptions)
      return processed
    } catch (err) {
      // se pós-process falhar, retorna resultado bruto
      // eslint-disable-next-line no-console
      console.error('Postprocess falhou:', err)
      return result
    }
  }

  return result
}
