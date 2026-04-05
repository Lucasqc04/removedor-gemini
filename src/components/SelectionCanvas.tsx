import { useEffect, useMemo, useRef, useState } from 'react'
import { Image as KonvaImage, Layer, Rect, Stage, Transformer, Shape } from 'react-konva'
import Konva from 'konva'
import type { SelectionRect } from '../types'
import { clamp, normalizeSelection, superellipsePoints } from '../utils/geometry'

interface SelectionCanvasProps {
  image: HTMLImageElement
  selection: SelectionRect
  onChange: (selection: SelectionRect) => void
  shape?: 'rect' | 'gemini'
}

export function SelectionCanvas({ image, selection, onChange, shape = 'rect' }: SelectionCanvasProps) {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window === 'undefined' ? 1280 : window.innerWidth,
  )

  const rectRef = useRef<Konva.Rect>(null)
  const shapeRef = useRef<Konva.Shape>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)

    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const transformer = transformerRef.current
    const rectangle = rectRef.current
    const shapeNode = shapeRef.current

    if (!transformer) return

    const node = shape === 'rect' ? rectangle : shapeNode
    if (!node) {
      transformer.nodes([])
      transformer.getLayer()?.batchDraw()
      return
    }

    transformer.nodes([node])
    transformer.getLayer()?.batchDraw()
  }, [selection, shape])

  const imageWidth = image.naturalWidth || image.width
  const imageHeight = image.naturalHeight || image.height

  const maxWidth = Math.min(980, Math.max(280, windowWidth - 36))
  const maxHeight = 640
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1)

  const stageWidth = Math.round(imageWidth * scale)
  const stageHeight = Math.round(imageHeight * scale)

  const displaySelection = useMemo(
    () => ({
      x: selection.x * scale,
      y: selection.y * scale,
      width: selection.width * scale,
      height: selection.height * scale,
    }),
    [selection, scale],
  )

  const applyDisplaySelection = (nextDisplay: SelectionRect) => {
    const boundedDisplay = {
      width: clamp(nextDisplay.width, 16, stageWidth),
      height: clamp(nextDisplay.height, 16, stageHeight),
      x: 0,
      y: 0,
    }

    boundedDisplay.x = clamp(nextDisplay.x, 0, stageWidth - boundedDisplay.width)
    boundedDisplay.y = clamp(nextDisplay.y, 0, stageHeight - boundedDisplay.height)

    const next = normalizeSelection(
      {
        x: boundedDisplay.x / scale,
        y: boundedDisplay.y / scale,
        width: boundedDisplay.width / scale,
        height: boundedDisplay.height / scale,
      },
      imageWidth,
      imageHeight,
    )

    onChange(next)
  }

  const handleDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => {
    applyDisplaySelection({
      x: event.target.x(),
      y: event.target.y(),
      width: displaySelection.width,
      height: displaySelection.height,
    })
  }

  const handleTransformEnd = () => {
    const node = rectRef.current ?? shapeRef.current
    if (!node) return

    const width = (node as any).width() * (node as any).scaleX()
    const height = (node as any).height() * (node as any).scaleY()

    ;(node as any).scaleX(1)
    ;(node as any).scaleY(1)

    applyDisplaySelection({
      x: (node as any).x(),
      y: (node as any).y(),
      width,
      height,
    })
  }

  return (
    <section className="canvas-panel">
      <Stage width={stageWidth} height={stageHeight} className="editor-stage">
        <Layer>
          <KonvaImage image={image} width={stageWidth} height={stageHeight} />

          {shape === 'rect' ? (
            <Rect
              ref={rectRef}
              x={displaySelection.x}
              y={displaySelection.y}
              width={displaySelection.width}
              height={displaySelection.height}
              draggable
              fill="rgba(255, 120, 67, 0.25)"
              stroke="#ff6f3f"
              strokeWidth={2}
              dash={[6, 4]}
              onDragEnd={handleDragEnd}
              onTransformEnd={handleTransformEnd}
            />
          ) : (
            <Shape
              ref={shapeRef}
              x={displaySelection.x}
              y={displaySelection.y}
              width={displaySelection.width}
              height={displaySelection.height}
              sceneFunc={(ctx, shapeObj) => {
                const w = shapeObj.width()
                const h = shapeObj.height()
                const cx = w / 2
                const cy = h / 2

                const n = 1.3
                const steps = 240
                const pts = superellipsePoints(n, steps)

                ctx.beginPath()
                for (let i = 0; i < pts.length; i++) {
                  const p = pts[i]
                  const px = cx + p.x * (w / 2)
                  const py = cy + p.y * (h / 2)

                  if (i === 0) ctx.moveTo(px, py)
                  else ctx.lineTo(px, py)
                }

                ctx.closePath()
                ctx.fillStrokeShape(shapeObj)
              }}
              fill="rgba(255, 120, 67, 0.25)"
              stroke="#ff6f3f"
              strokeWidth={2}
              draggable
              onDragEnd={handleDragEnd}
              onTransformEnd={handleTransformEnd}
            />
          )}

          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            keepRatio={false}
            borderStroke="#f7ff90"
            anchorFill="#f7ff90"
            anchorStroke="#101a26"
            anchorSize={9}
            padding={3}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 18 || newBox.height < 18) {
                return oldBox
              }
              if (
                newBox.x < 0 ||
                newBox.y < 0 ||
                newBox.x + newBox.width > stageWidth ||
                newBox.y + newBox.height > stageHeight
              ) {
                return oldBox
              }
              return newBox
            }}
          />
        </Layer>
      </Stage>

      <p className="canvas-caption">
        Arraste a área para cima da marca e ajuste pelos pontos amarelos.
      </p>
    </section>
  )
}
