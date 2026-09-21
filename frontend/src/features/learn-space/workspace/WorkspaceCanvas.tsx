import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import { cn } from '@/lib/utils'
import { WORKSPACE_NODE_CARD } from './workspaceStyles'
import type { WorkspaceNode } from './workspaceTypes'

export interface WorkspaceCanvasProps {
  nodes: WorkspaceNode[]
  /** 画布缩放百分比；节点层整体缩放，拖动位移要按比例换算。 */
  zoom: number
  onOpenNode?: (node: WorkspaceNode) => void
}

interface DragSession {
  nodeId: string
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

/** 超过这个位移才算「拖动」，否则当点击处理。 */
const DRAG_THRESHOLD_PX = 4

/**
 * 画布本体：绝对定位的节点 + 拖动。
 *
 * 拖动是自己实现的（pointer events，无第三方依赖）——画板层（tldraw）已按
 * 既定范围推迟，这里只需要「能把卡片挪开、别压在一起」。位置是画布态，不落库，
 * 刷新后回到初始排布。
 *
 * 注意：**不能用 setPointerCapture**。一旦捕获，后续的 click 会被重定向到捕获
 * 元素，卡片按钮就再也收不到点击了（实测踩过）。所以拖动期间把 pointermove/up
 * 挂到 window 上，点击语义保持原样。
 */
export function WorkspaceCanvas({
  nodes,
  zoom,
  onOpenNode,
}: WorkspaceCanvasProps) {
  const [draggedPositions, setDraggedPositions] = useState<
    Record<string, { x: number; y: number }>
  >({})
  const [dragSession, setDragSession] = useState<DragSession | null>(null)
  const dragRef = useRef<DragSession | null>(null)
  // pointerup 之后浏览器还会补一次 click：拖动过就吞掉它，避免「拖完顺手打开了」
  const justDraggedRef = useRef(false)

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, node: WorkspaceNode) => {
      if (event.button !== 0) return
      const origin = draggedPositions[node.id] ?? { x: node.x, y: node.y }
      justDraggedRef.current = false
      const session: DragSession = {
        nodeId: node.id,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: origin.x,
        originY: origin.y,
      }
      dragRef.current = session
      setDragSession(session)
    },
    [draggedPositions]
  )

  useEffect(() => {
    if (!dragSession) return
    const scale = zoom / 100

    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      const dx = (event.clientX - drag.startX) / scale
      const dy = (event.clientY - drag.startY) / scale
      if (!justDraggedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
        return
      }
      justDraggedRef.current = true
      setDraggedPositions((previous) => ({
        ...previous,
        [drag.nodeId]: { x: drag.originX + dx, y: drag.originY + dy },
      }))
    }

    const handleUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      dragRef.current = null
      setDragSession(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [dragSession, zoom])

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute left-0 top-0 size-full origin-top-left"
        style={{ transform: `scale(${zoom / 100})` }}
      >
        {nodes.map((node) => {
          const position = draggedPositions[node.id] ?? { x: node.x, y: node.y }
          const isDragging = dragSession?.nodeId === node.id

          return (
            <div
              key={node.id}
              className="absolute touch-none"
              data-workspace-node={node.id}
              style={{ left: position.x, top: position.y }}
              onPointerDown={(event) => handlePointerDown(event, node)}
            >
              <button
                type="button"
                // 占位节点（还没有内容的对话）不可打开：aria 上报「不可用」，
                // 但仍然拖得动。
                aria-disabled={!node.href}
                onClick={() => {
                  if (justDraggedRef.current || !node.href) return
                  onOpenNode?.(node)
                }}
                className={cn(
                  WORKSPACE_NODE_CARD,
                  'cursor-grab',
                  isDragging && 'cursor-grabbing ring-zinc-300'
                )}
              >
                <span
                  className={cn(
                    'block max-w-full truncate',
                    !node.title && 'text-zinc-400'
                  )}
                >
                  {node.title || '未命名对话'}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
