import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'

const MIN_SCALE = 0.25
const MAX_SCALE = 3
const ZOOM_STEP = 1.2
const GRID_SPACING = 24

interface Viewport {
  x: number
  y: number
  scale: number
}

const INITIAL_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 }

function zoomAround(viewport: Viewport, factor: number, x: number, y: number): Viewport {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale * factor))
  if (scale === viewport.scale) return viewport

  const ratio = scale / viewport.scale
  return {
    x: x - (x - viewport.x) * ratio,
    y: y - (y - viewport.y) * ratio,
    scale,
  }
}

export function BoardCanvas({ children }: { children?: ReactNode }) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientHeight : 1
      const deltaX = event.deltaX * unit
      const deltaY = event.deltaY * unit

      // 触控板捏合会产生 ctrlKey wheel；以指针为锚点，缩放时不跳位。
      if (event.ctrlKey || event.metaKey) {
        const rect = surface.getBoundingClientRect()
        setViewport((current) => zoomAround(
          current,
          Math.exp(-deltaY * 0.002),
          event.clientX - rect.left,
          event.clientY - rect.top
        ))
      } else {
        setViewport((current) => ({
          ...current,
          x: current.x - (event.shiftKey && deltaX === 0 ? deltaY : deltaX),
          y: current.y - (event.shiftKey && deltaX === 0 ? 0 : deltaY),
        }))
      }
    }

    // 非 passive 监听只作用于画布，避免缩放手势触发浏览器整页缩放。
    surface.addEventListener('wheel', handleWheel, { passive: false })
    return () => surface.removeEventListener('wheel', handleWheel)
  }, [])

  const zoomAtCenter = (factor: number) => {
    const surface = surfaceRef.current
    if (!surface) return
    setViewport((current) => zoomAround(
      current, factor, surface.clientWidth / 2, surface.clientHeight / 2
    ))
  }

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || dragRef.current) return
    if (event.button !== 0 && event.button !== 1) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    setIsDragging(true)
  }

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY }
    setViewport((current) => ({ ...current, x: current.x + dx, y: current.y + dy }))
  }

  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.metaKey || event.ctrlKey || event.altKey) return
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      zoomAtCenter(ZOOM_STEP)
    } else if (event.key === '-') {
      event.preventDefault()
      zoomAtCenter(1 / ZOOM_STEP)
    } else if (event.key === '0') {
      event.preventDefault()
      setViewport(INITIAL_VIEWPORT)
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault()
      setViewport((current) => ({
        ...current,
        x: current.x + (event.key === 'ArrowLeft' ? 40 : event.key === 'ArrowRight' ? -40 : 0),
        y: current.y + (event.key === 'ArrowUp' ? 40 : event.key === 'ArrowDown' ? -40 : 0),
      }))
    }
  }

  const spacing = GRID_SPACING * viewport.scale
  const dotRadius = Math.min(1.4, Math.max(0.45, viewport.scale * 0.85))

  return (
    <>
      <div
        ref={surfaceRef}
        role="region"
        aria-label="白板画布"
        tabIndex={0}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={stopDrag}
        onKeyDown={handleKeyDown}
        className={`absolute inset-0 touch-none overflow-hidden bg-zinc-100 outline-none select-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-zinc-300 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          backgroundImage: `radial-gradient(circle, rgb(161 161 170 / 0.45) ${dotRadius}px, transparent ${dotRadius + 0.4}px)`,
          backgroundSize: `${spacing}px ${spacing}px`,
          backgroundPosition: `${viewport.x - spacing / 2}px ${viewport.y - spacing / 2}px`,
        }}
      >
        {/* 内容与点阵共用视口坐标；浮层工具不参与画布变换。 */}
        <div
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{ transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})` }}
        >
          {children}
        </div>
      </div>

      <div
        role="group"
        aria-label="画布缩放"
        className="absolute bottom-8 left-8 z-20 flex items-center gap-0.5 rounded-full border border-zinc-200/80 bg-zinc-50 p-1 text-zinc-600"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="缩小画布"
          title="缩小"
          disabled={viewport.scale <= MIN_SCALE}
          onClick={() => zoomAtCenter(1 / ZOOM_STEP)}
          className="rounded-full hover:bg-zinc-200/60"
        >
          <Minus className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="重置画布视图"
          title="恢复 100% 并重置位置"
          onClick={() => setViewport(INITIAL_VIEWPORT)}
          className="h-8 min-w-14 rounded-full px-2 tabular-nums hover:bg-zinc-200/60"
        >
          {Math.round(viewport.scale * 100)}%
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="放大画布"
          title="放大"
          disabled={viewport.scale >= MAX_SCALE}
          onClick={() => zoomAtCenter(ZOOM_STEP)}
          className="rounded-full hover:bg-zinc-200/60"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </>
  )
}
