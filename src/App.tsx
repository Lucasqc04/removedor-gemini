import { useEffect, useState } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { SelectionCanvas } from './components/SelectionCanvas'
import { UploadArea } from './components/UploadArea'
import ProcessingModal from './components/ProcessingModal'
import type { SelectionRect, Corner, RelativeSize } from './types'
import { downloadDataURL, loadImageFromURL } from './utils/image'
import { createCornerSelection } from './utils/geometry'
import { removeSelectionFromImage } from './utils/inpaint'
import type { InpaintAlgorithm, InpaintOptions } from './utils/inpaint-algorithms'
import ImageViewer from './components/ImageViewer'



function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [selection, setSelection] = useState<SelectionRect | null>(null)
  const [corner, setCorner] = useState<Corner>('bottom-right')
  const [size, setSize] = useState<RelativeSize>({ widthPercent: 12, heightPercent: 8 })
  const [expand, setExpand] = useState(8)
  const [iterations, setIterations] = useState(190)
  const [selectionMargin, setSelectionMargin] = useState(10)
  const [results, setResults] = useState<Array<{ src: string; label: string }>>([])
  const [selectedResult, setSelectedResult] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectionShape, setSelectionShape] = useState<'rect' | 'gemini'>('rect')
  const [currentAlgoLabel, setCurrentAlgoLabel] = useState<string>('')
  const [currentAlgoIndex, setCurrentAlgoIndex] = useState<number>(0)
  const [algoProgress, setAlgoProgress] = useState<number>(0)
  const [totalAlgorithms, setTotalAlgorithms] = useState<number>(0)

  useEffect(() => {
    return () => {
      setImageSrc((prev) => {
        if (prev?.startsWith('blob:')) {
          URL.revokeObjectURL(prev)
        }

        return prev
      })
    }
  }, [])

  useEffect(() => {
    if (!imageElement) return

    const w = imageElement.naturalWidth || imageElement.width
    const h = imageElement.naturalHeight || imageElement.height
    setSelection(createCornerSelection(w, h, corner, size, selectionMargin))
  }, [imageElement, corner, size, selectionMargin])

  const clearCurrentImage = () => {
    setImageSrc((prev) => {
      if (prev?.startsWith('blob:')) {
        URL.revokeObjectURL(prev)
      }

      return null
    })

    setImageElement(null)
    setSelection(null)
    setError(null)
    setIsProcessing(false)
  }

  const handleSelectFile = async (file: File) => {
    setError(null)

    const nextSrc = URL.createObjectURL(file)

    try {
      const loadedImage = await loadImageFromURL(nextSrc)

      setImageSrc((prev) => {
        if (prev?.startsWith('blob:')) {
          URL.revokeObjectURL(prev)
        }

        return nextSrc
      })

      setImageElement(loadedImage)
    } catch {
      URL.revokeObjectURL(nextSrc)
      setError('Nao foi possivel ler o arquivo. Tente outra imagem.')
    }
  }

  const handleResetSelection = () => {
    if (!imageElement) return
    const w = imageElement.naturalWidth || imageElement.width
    const h = imageElement.naturalHeight || imageElement.height
    setSelection(createCornerSelection(w, h, corner, size, selectionMargin))
  }

  const handleApplyPreset = (preset: { width: number; height: number; marginRight: number; marginBottom: number; corner?: Corner }) => {
    if (!imageElement) return

    const w = imageElement.naturalWidth || imageElement.width
    const h = imageElement.naturalHeight || imageElement.height

    const widthPercent = (preset.width / w) * 100
    const heightPercent = (preset.height / h) * 100

    setSelectionMargin(preset.marginRight ?? 10)
    setCorner(preset.corner ?? 'bottom-right')
    setSize({ widthPercent: Math.round(widthPercent * 100) / 100, heightPercent: Math.round(heightPercent * 100) / 100 })
  }

  const handleProcess = async () => {
    if (!imageElement || !selection || isProcessing) {
      return
    }

    setIsProcessing(true)
    setError(null)
    setResults([])
    setSelectedResult(null)

    const algorithms: Array<{ key: InpaintAlgorithm; label: string; opts?: Partial<InpaintOptions> }> = [
      { key: 'diffusion', label: 'Difusão Simples' },
      { key: 'patchmatch', label: 'PatchMatch' },

      {
        key: 'telea',
        label: 'Telea — Forte',
        opts: { smoothing: 'gaussian', smoothingAmount: 2.2, gradientBlend: true, blendStrength: 1 },
      },
      {
        key: 'telea',
        label: 'Telea — Balanceado',
        opts: { smoothing: 'gaussian', smoothingAmount: 1.2, gradientBlend: true, blendStrength: 0.8 },
      },
      {
        key: 'telea',
        label: 'Telea — Suave',
        opts: { smoothing: 'gaussian', smoothingAmount: 0.6, gradientBlend: false, blendStrength: 0.5 },
      },

    ]

    setTotalAlgorithms(algorithms.length)

    try {
      const completed: Array<{ src: string; label: string }> = []

      for (let i = 0; i < algorithms.length; i += 1) {
        const algo = algorithms[i]
        setCurrentAlgoLabel(`Aplicando ${algo.label}...`)
        setCurrentAlgoIndex(i + 1)
        setAlgoProgress(5)

        // permite que o modal seja renderizado antes do trabalho pesado
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 80))

        // fallback de progresso (caso o algoritmo não reporte)
        let intervalId: number | null = null
        let progressReported = false
        // eslint-disable-next-line no-await-in-loop
        intervalId = window.setInterval(() => {
          if (!progressReported) setAlgoProgress((p) => Math.min(85, p + Math.random() * 6 + 1))
        }, 300)

        const t0 = Date.now()
        // eslint-disable-next-line no-await-in-loop
        try {
          // eslint-disable-next-line no-await-in-loop
          const inpaintOpts: InpaintOptions = {
            expand,
            iterations,
            algorithm: algo.key,
            maskType: selectionShape,
            onProgress: (pct?: number, msg?: string) => {
              progressReported = true
              if (intervalId) {
                window.clearInterval(intervalId)
                intervalId = null
              }
              if (typeof pct === 'number') setAlgoProgress(Math.round(pct))
              if (msg) setCurrentAlgoLabel(msg)
            },
            ...(algo.opts || {}),
          }

          const src = await removeSelectionFromImage(imageElement, selection, inpaintOpts)
          // eslint-disable-next-line no-console
          console.info(`[App] ${algo.label} completed in ${Date.now() - t0}ms`)
          completed.push({ src, label: algo.label })
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`[App] ${algo.label} error`, err)
          completed.push({ src: '', label: algo.label + ' (erro)' })
        } finally {
          if (intervalId) window.clearInterval(intervalId)
          setAlgoProgress(100)
          setResults([...completed])
          // pequena pausa para visualizar o algoritmo concluído
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 160))
        }
      }

      // Não abrir o viewer automaticamente — aguardar clique do usuário
      setSelectedResult(null)
    } catch {
      setError('Falha ao processar. Reduza a area ou teste outra imagem.')
    } finally {
      setIsProcessing(false)
      setCurrentAlgoLabel('')
      setCurrentAlgoIndex(0)
      setAlgoProgress(0)
      setTotalAlgorithms(0)
    }
  }

  const handleDownload = () => {
    if (selectedResult == null || !results[selectedResult]?.src) {
      return
    }
    const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
    downloadDataURL(results[selectedResult].src, `imagem-sem-marca-${stamp}.png`)
  }

  // Navegação para o viewer grande (anterior/próximo)
  const handleViewerPrev = () => {
    setSelectedResult((prev) => {
      if (prev == null) return prev
      const next = prev - 1
      return next >= 0 ? next : (results.length - 1)
    })
  }

  const handleViewerNext = () => {
    setSelectedResult((prev) => {
      if (prev == null) return prev
      const next = prev + 1
      return next < results.length ? next : 0
    })
  }

  const showViewerNav = results.length > 1

  const canEditImage = Boolean(imageSrc && imageElement && selection)

  const imageWidth = imageElement ? imageElement.naturalWidth || imageElement.width : 0
  const imageHeight = imageElement
    ? imageElement.naturalHeight || imageElement.height
    : 0

  return (
    <div className="app-shell">
      <ProcessingModal
        visible={isProcessing}
        label={currentAlgoLabel || 'Processando...'}
        index={currentAlgoIndex}
        total={totalAlgorithms}
        progress={algoProgress}
      />
      <header className="hero">
        <p className="hero-brand">Removedor de Marca d&apos;Agua</p>
        <h1 className="hero-title">Limpeza rapida para marca pequena em canto</h1>
        <p className="hero-subtitle">
          Suba a imagem, ajuste o retangulo e gere o resultado no navegador.
          Sem interface poluida e sem dependencias de IA pesada.
        </p>
      </header>

      <section className="workspace" aria-live="polite">
        <div className="workspace-main">
          {imageSrc && imageElement && selection ? (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                <button
                  type="button"
                  className={selectionShape === 'rect' ? 'btn btn-primary' : 'btn'}
                  onClick={() => setSelectionShape('rect')}
                >
                  Seleção Retangular
                </button>
                <button
                  type="button"
                  className={selectionShape === 'gemini' ? 'btn btn-primary' : 'btn'}
                  onClick={() => {
                    setSelectionShape('gemini')
                    // aplica preset Inferior Direito 78×78 com margem 17px
                    handleApplyPreset({ width: 78, height: 78, marginRight: 17, marginBottom: 17, corner: 'bottom-right' })
                  }}
                >
                  Seleção Gemini
                </button>
              </div>
              <SelectionCanvas
                image={imageElement}
                selection={selection}
                onChange={setSelection}
                shape={selectionShape}
              />
            </>
          ) : (
            <UploadArea onSelectFile={handleSelectFile} disabled={isProcessing} />
          )}

          {error ? <p className="error-message">{error}</p> : null}
        </div>

        {imageSrc && imageElement && selection ? (
          <ControlPanel
            corner={corner}
            onCornerChange={setCorner}
            size={size}
            onSizeChange={setSize}
            expand={expand}
            onExpandChange={setExpand}
            iterations={iterations}
            onIterationsChange={setIterations}
            selection={selection}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            onProcess={handleProcess}
            onResetSelection={handleResetSelection}
            onApplyPreset={handleApplyPreset}
            onClear={clearCurrentImage}
            isProcessing={isProcessing}
          />
        ) : (
          <aside className="quick-guide">
            <p className="section-eyebrow">FLUXO</p>
            <h2>Pronto para marca d&apos;agua pequena</h2>
            <p>1. Envie a imagem</p>
            <p>2. Ajuste o retangulo na marca</p>
            <p>3. Clique em remover e baixe</p>
          </aside>
        )}
      </section>

      {results.length > 0 && imageSrc && canEditImage ? (
        <section className="result-zone">
          <div className="result-head">
            <h2>Resultados dos Algoritmos</h2>
          </div>
          {isProcessing && (
            <div className="loading-overlay">
              <div className="loader" />
              <span>Processando imagens...</span>
            </div>
          )}
          <div className="multi-result-grid">
            {results.map((result, idx) => (
              <div
                key={result.label}
                className={`multi-thumb ${selectedResult === idx ? 'multi-thumb-selected' : ''}`}
                onClick={() => setSelectedResult(idx)}
                title={result.label}
                style={{ aspectRatio: imageWidth && imageHeight ? `${imageWidth} / ${imageHeight}` : undefined, width: 'min(340px, 100%)', maxWidth: '100%', minHeight: 0 }}
              >
                <img
                  src={result.src}
                  alt={result.label}
                  className="multi-thumb-img"
                  style={{ aspectRatio: imageWidth && imageHeight ? `${imageWidth} / ${imageHeight}` : undefined, width: '100%', height: '100%', maxHeight: '260px', objectFit: 'contain', background: '#fff' }}
                />
                <div className="multi-thumb-label">{result.label}</div>
              </div>
            ))}
          </div>
          {selectedResult != null && results[selectedResult]?.src ? (
            <ImageViewer
              src={results[selectedResult].src}
              alt={results[selectedResult].label}
              isOpen={selectedResult != null && Boolean(results[selectedResult]?.src)}
              onClose={() => setSelectedResult(null)}
              onDownload={handleDownload}
              onPrev={handleViewerPrev}
              onNext={handleViewerNext}
              showNav={showViewerNav}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

export default App
