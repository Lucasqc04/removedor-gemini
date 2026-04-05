import React, { useCallback, useEffect, useRef, useState } from 'react'

interface ImageViewerProps {
  src: string
  alt?: string
  isOpen: boolean
  onClose: () => void
  onDownload?: () => void
  onPrev?: () => void
  onNext?: () => void
  showNav?: boolean
}

export default function ImageViewer({ src, alt = '', isOpen, onClose, onDownload, onPrev, onNext, showNav = false }: ImageViewerProps) {
  const [zoomLevel, setZoomLevel] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const initialPinchRef = useRef<{ distance: number; zoom: number } | null>(null)
  const lastTapRef = useRef<number>(0)

  const imageRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1)
      setRotation(0)
      setPosition({ x: 0, y: 0 })
    }
  }, [isOpen])

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false)
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

  const applyZoomAtPoint = useCallback((nextZoom: number, cx: number, cy: number) => {
    nextZoom = clamp(nextZoom, 0.5, 5)
    setZoomLevel((prevZoom) => {
      if (!imageRef.current) return nextZoom
      if (prevZoom === nextZoom) return prevZoom
      const rect = imageRef.current.getBoundingClientRect()
      const rx = (cx - rect.left) / rect.width
      const ry = (cy - rect.top) / rect.height
      setPosition((prevPos) => {
        if (nextZoom <= 1) return { x: 0, y: 0 }
        const scaleDelta = nextZoom / prevZoom
        const newX = (prevPos.x - (rx - 0.5) * rect.width) * scaleDelta + (rx - 0.5) * rect.width
        const newY = (prevPos.y - (ry - 0.5) * rect.height) * scaleDelta + (ry - 0.5) * rect.height
        return { x: newX, y: newY }
      })
      return nextZoom
    })
  }, [])

  const handleZoomIn = useCallback(() => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect()
      applyZoomAtPoint(zoomLevel + 0.5, rect.left + rect.width / 2, rect.top + rect.height / 2)
    } else {
      setZoomLevel((prev) => Math.min(prev + 0.5, 5))
    }
  }, [zoomLevel, applyZoomAtPoint])

  const handleZoomOut = useCallback(() => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect()
      applyZoomAtPoint(zoomLevel - 0.5, rect.left + rect.width / 2, rect.top + rect.height / 2)
    } else {
      setZoomLevel((prev) => Math.max(prev - 0.5, 0.5))
    }
  }, [zoomLevel, applyZoomAtPoint])

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!imageRef.current) return
    const next = zoomLevel <= 1 ? 2 : 1
    applyZoomAtPoint(next, e.clientX, e.clientY)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      initialPinchRef.current = { distance: dist, zoom: zoomLevel }
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2 && initialPinchRef.current) {
      const pts = Array.from(pointersRef.current.values())
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const { distance, zoom } = initialPinchRef.current
      if (distance > 0) {
        const scale = dist / distance
        const midX = (pts[0].x + pts[1].x) / 2
        const midY = (pts[0].y + pts[1].y) / 2
        applyZoomAtPoint(zoom * scale, midX, midY)
      }
    } else if (isDragging) {
      e.preventDefault()
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) initialPinchRef.current = null
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now()
    if (e.touches.length === 1 && now - lastTapRef.current < 300) {
      const t = e.touches[0]
      if (imageRef.current) {
        applyZoomAtPoint(zoomLevel <= 1 ? 2 : 1, t.clientX, t.clientY)
      }
      e.preventDefault()
    }
    lastTapRef.current = now
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { clientX, clientY, deltaY, deltaMode } = e as any
      let delta = deltaY
      if (deltaMode === 1) delta *= 15
      else if (deltaMode === 2) delta *= 100
      const sensitivity = 300
      const factor = 1 - delta / sensitivity
      let targetZoom = zoomLevel * factor
      applyZoomAtPoint(targetZoom, clientX, clientY)
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [zoomLevel, applyZoomAtPoint, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        handleZoomIn()
      } else if (e.key === '-') {
        e.preventDefault()
        handleZoomOut()
      } else if (e.key === '0') {
        e.preventDefault()
        handleResetView()
      } else if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (onPrev) onPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (onNext) onNext()
      }
    }
    window.addEventListener('keydown', handleKey, { passive: false })
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, handleZoomIn, handleZoomOut, onClose, onPrev, onNext])

  const getImageUrl = () => {
    if (!src) return ''
    if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')) return src
    return `data:image/jpeg;base64,${src}`
  }

  const handleDirectDownload = () => {
    if (!src) return
    try {
      const imageUrl = getImageUrl()
      setTimeout(() => {
        const link = document.createElement('a')
        link.href = imageUrl
        link.download = `imagem_${new Date().toISOString().split('T')[0]}.png`
        document.body.appendChild(link)
        link.click()
        if (link.parentNode) document.body.removeChild(link)
      }, 0)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Falha ao baixar imagem:', error)
    }
  }

  const handleDownloadClick = () => {
    if (onDownload) onDownload()
    else handleDirectDownload()
  }

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)

  const handleResetView = () => {
    setZoomLevel(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseUp = () => setIsDragging(false)

  if (!isOpen) return null

  return (
    <div className="result-large-bg" onClick={onClose}>
      {showNav && onPrev ? (
        <button
          aria-label="Anterior"
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="btn"
          style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 1100 }}
        >
          ◀
        </button>
      ) : null}
      {showNav && onNext ? (
        <button
          aria-label="Próxima"
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="btn"
          style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 1100 }}
        >
          ▶
        </button>
      ) : null}

      <div className="result-large" onClick={(e) => e.stopPropagation()}>
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>{alt}</h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button type="button" onClick={handleZoomOut} className="btn">−</button>
              <div style={{ color: 'var(--muted)', minWidth: 44, textAlign: 'center' }}>{(zoomLevel * 100).toFixed(0)}%</div>
              <button type="button" onClick={handleZoomIn} className="btn">＋</button>
            </div>
            <button type="button" onClick={handleRotate} className="btn">⟳</button>
            <button type="button" onClick={handleResetView} className="btn">⟲</button>
            <button type="button" onClick={handleDownloadClick} className="btn">Baixar</button>
            <button type="button" onClick={onClose} className="btn">Fechar</button>
          </div>
        </div>

        <div
          ref={containerRef}
          onPointerDown={(e) => { onPointerDown(e); handleMouseDown(e as any) }}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => { onPointerUp(e); handleMouseUp() }}
          onPointerCancel={onPointerUp}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: isDragging || pointersRef.current.size === 2 ? 'grabbing' : (zoomLevel > 1 ? 'grab' : 'default'), touchAction: 'none' }}
        >
          <div style={{ transform: `translate(${position.x}px, ${position.y}px)`, transition: isDragging || pointersRef.current.size === 2 ? 'none' : 'transform 0.1s ease-out', maxWidth: '80vw', maxHeight: '60vh' }}>
            <img
              ref={imageRef}
              src={getImageUrl()}
              alt={alt}
              style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)`, transformOrigin: 'center', transition: (isDragging || pointersRef.current.size === 2) ? 'none' : 'transform 0.15s ease-out', maxWidth: '80vw', maxHeight: '60vh', objectFit: 'contain', display: 'block', borderRadius: 12, background: '#fff' }}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
