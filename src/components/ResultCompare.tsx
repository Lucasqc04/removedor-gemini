import { useMemo, useState } from 'react'

interface ResultCompareProps {
  beforeSrc: string
  afterSrc: string
  imageWidth: number
  imageHeight: number
}

export function ResultCompare({
  beforeSrc,
  afterSrc,
  imageWidth,
  imageHeight,
}: ResultCompareProps) {
  const [split, setSplit] = useState(58)

  const aspectRatio = useMemo(() => {
    if (imageWidth <= 0 || imageHeight <= 0) {
      return '16 / 9'
    }

    return `${imageWidth} / ${imageHeight}`
  }, [imageWidth, imageHeight])

  return (
    <section className="result-panel">
      <div className="compare-frame" style={{ aspectRatio }}>
        <img src={beforeSrc} alt="Imagem original" className="compare-image" />

        <div
          className="compare-after"
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        >
          <img src={afterSrc} alt="Imagem sem marca d'agua" className="compare-image" />
        </div>

        <div className="compare-divider" style={{ left: `${split}%` }} />
        <span className="compare-tag compare-tag-before">Antes</span>
        <span className="compare-tag compare-tag-after">Depois</span>
      </div>

      <label htmlFor="compare-range" className="field-label">
        Comparacao visual: <strong>{split}%</strong>
      </label>
      <input
        id="compare-range"
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(event) => setSplit(Number(event.target.value))}
      />
    </section>
  )
}
