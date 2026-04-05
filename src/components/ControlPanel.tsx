import type { Corner, RelativeSize, SelectionRect } from '../types'

interface ControlPanelProps {
  corner: Corner
  onCornerChange: (corner: Corner) => void
  size: RelativeSize
  onSizeChange: (size: RelativeSize) => void
  expand: number
  onExpandChange: (expand: number) => void
  iterations: number
  onIterationsChange: (iterations: number) => void
  selection: SelectionRect
  imageWidth: number
  imageHeight: number
  onProcess: () => void
  onResetSelection: () => void
  onClear: () => void
  onApplyPreset: (preset: { width: number; height: number; marginRight: number; marginBottom: number; corner?: Corner }) => void
  isProcessing: boolean
}


export function ControlPanel({
  corner,
  onCornerChange,
  size,
  onSizeChange,
  expand,
  onExpandChange,
  iterations,
  onIterationsChange,
  selection,
  imageWidth,
  imageHeight,
  onProcess,
  onResetSelection,
  onClear,
  onApplyPreset,
  isProcessing,
}: ControlPanelProps) {
  return (
    <aside className="control-panel">
      {/* Presets only; AREA PADRAO removed per user request */}
      <div>
        <p className="section-eyebrow">PRESETS</p>
        <div className="corner-grid">
          <button
            type="button"
            className="chip"
            onClick={() =>
              onApplyPreset({
                width: 78,
                height: 78,
                marginRight: 17,
                marginBottom: 17,
                corner: 'bottom-right',
              })
            }
          >
            Inferior Dir. — 78×78 (17px)
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="size-width" className="field-label">
          Largura da selecao: <strong>{size.widthPercent}%</strong>
        </label>
        <input
          id="size-width"
          type="range"
          min={4}
          max={45}
          value={size.widthPercent}
          onChange={(event) =>
            onSizeChange({
              ...size,
              widthPercent: Number(event.target.value),
            })
          }
        />
      </div>

      <div>
        <label htmlFor="size-height" className="field-label">
          Altura da selecao: <strong>{size.heightPercent}%</strong>
        </label>
        <input
          id="size-height"
          type="range"
          min={3}
          max={25}
          value={size.heightPercent}
          onChange={(event) =>
            onSizeChange({
              ...size,
              heightPercent: Number(event.target.value),
            })
          }
        />
      </div>

      <div>
        <label htmlFor="expand" className="field-label">
          Borda de mistura: <strong>{expand}px</strong>
        </label>
        <input
          id="expand"
          type="range"
          min={0}
          max={24}
          value={expand}
          onChange={(event) => onExpandChange(Number(event.target.value))}
        />
      </div>

      <div>
        <label htmlFor="iterations" className="field-label">
          Intensidade da remocao: <strong>{iterations}</strong>
        </label>
        <input
          id="iterations"
          type="range"
          min={60}
          max={360}
          step={10}
          value={iterations}
          onChange={(event) => onIterationsChange(Number(event.target.value))}
        />
      </div>

      <div className="selection-meta">
        <p className="section-eyebrow">SELECAO ATUAL</p>
        <p>
          {Math.round(selection.width)} x {Math.round(selection.height)} px
        </p>
        <p>
          Posicao: ({Math.round(selection.x)}, {Math.round(selection.y)})
        </p>
        <p>
          Imagem: {imageWidth} x {imageHeight} px
        </p>
      </div>

      <div className="button-row">
        <button type="button" className="btn btn-secondary" onClick={onResetSelection}>
          Reposicionar no canto
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onProcess}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processando...' : 'Remover marca'}
        </button>
      </div>

      <button type="button" className="clear-link" onClick={onClear}>
        Trocar imagem
      </button>
    </aside>
  )
}
