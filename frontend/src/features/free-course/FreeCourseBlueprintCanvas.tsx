import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAppTranslation } from '@/i18n'

// Lightweight point-canvas primitive for the free-course blueprint (decision
// D1-a: a parallel instance, visually-same-but-independent from the learn-space
// WorkspaceCanvas — staged forward so it never touches 0ab5f433). Drag the empty
// canvas to pan; the zoom buttons re-scale; node positions are absolute in world
// coordinates and the whole layer scales via `transform: scale`.
//
// P2 renders it read-only; P3 adds editing on the same primitive.

export interface FreeCourseBlueprintNode {
  id: string
  kind: 'unit' | 'lesson'
  title: string
  objective?: string
  x: number
  y: number
  active?: boolean
  onClick?: () => void
}

interface FreeCourseBlueprintCanvasProps {
  nodes: FreeCourseBlueprintNode[]
  zoom?: number
  className?: string
}

const DRAG_THRESHOLD_PX = 4

// Uniform dot-matrix background (avoid "色块感" — a fine dotted field).
const dotBackgroundStyle = {
  backgroundImage: 'radial-gradient(circle, #e4e4e7 1px, transparent 1px)',
  backgroundSize: '22px 22px',
} as const

const unitNodeClassName =
  'w-[180px] rounded-[12px] border border-zinc-300 bg-white px-3.5 py-2.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900'
const lessonNodeClassName =
  'w-[168px] rounded-[10px] border border-zinc-200 bg-white/70 px-3 py-2 backdrop-blur-[1px] dark:border-zinc-800 dark:bg-zinc-900/70'

export function FreeCourseBlueprintCanvas({
  nodes,
  zoom = 100,
  className,
}: FreeCourseBlueprintCanvasProps) {
  const { t } = useAppTranslation()
  // Controlled zoom vs. internal-view pan: the host owns zoom; pan is transient.
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{
    startX: number
    startY: number
    carriedPan: { x: number; y: number }
    moved: boolean
  } | null>(null)

  // Keep the latest pan readable inside the drag closure without re-binding.
  const panRef = useRef(pan)
  panRef.current = pan

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      carriedPan: panRef.current,
      moved: false,
    }
  }, [])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return

    drag.moved = true
    setPan({ x: drag.carriedPan.x + dx, y: drag.carriedPan.y + dy })
  }, [])

  const endDrag = useCallback(() => {
    dragRef.current = null
  }, [])

  return (
    <div className={cn('relative flex flex-col', className)}>
      <div
        role="application"
        aria-label={t('freeCourse.blueprintCanvasLabel')}
        className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 touch-none select-none dark:border-zinc-800 dark:bg-zinc-950"
        style={dotBackgroundStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
            transformOrigin: 'center center',
          }}
        >
          {nodes.map((node) => (
            <BlueprintNode key={node.id} node={node} />
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-[12px] leading-4 text-zinc-400 dark:text-zinc-500">
          {t('freeCourse.zoom', { zoom })}
        </p>
        <button
          type="button"
          className="text-[12px] leading-4 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          onClick={() => setPan({ x: 0, y: 0 })}
        >
          {t('freeCourse.resetView')}
        </button>
      </div>
    </div>
  )
}

function BlueprintNode({ node }: { node: FreeCourseBlueprintNode }) {
  const isUnit = node.kind === 'unit'
  return (
    <button
      type="button"
      onClick={node.onClick}
      className={cn(
        'absolute flex flex-col text-left',
        isUnit ? unitNodeClassName : lessonNodeClassName
      )}
      style={{ left: node.x, top: node.y }}
    >
      <span
        className={cn(
          'truncate text-[13px] font-medium',
          isUnit ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'
        )}
      >
        {node.title}
      </span>
      {node.objective ? (
        <span className="line-clamp-2 mt-1 text-[11px] leading-4 text-zinc-400 dark:text-zinc-500">
          {node.objective}
        </span>
      ) : null}
    </button>
  )
}