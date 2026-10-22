import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import type { CanvasElement } from './canvasData'
import { CanvasElementCard } from './CanvasElementCard'

export interface PrototypeCanvasProps {
  elements: CanvasElement[]
  zoom: number
  selectedId: string | null
  /** note/interactive 的拖动只认头部条；file 全卡。由卡片内部决定把事件绑在哪。 */
  onSelect: (id: string) => void
  onElementChange: (id: string, patch: Partial<CanvasElement>) => void
  onOpenFile: (element: CanvasElement) => void
}

interface DragSession {
  elementId: string
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

const DRAG_THRESHOLD_PX = 4

/**
 * 原型画布 —— **拖动逻辑来自 `workspace/WorkspaceCanvas.tsx`，逐行复制**（非提取）。
 *
 * 为什么复制：那是一个无测试保护的生产组件，为原型提取共享 hook 等于先重构再试验。
 * 转正时的第一件事是把这份拖动提取成 `useCanvasDrag`，两边共用 —— 已写在
 * `docs/planning/space-canvas-prototype.md` §2。
 *
 * 与原版的三处不同：
 * 1. 节点渲染交给 `CanvasElementCard`（三类形态不同）；
 * 2. 拖动起点由卡片决定（file 全卡，note/interactive 只认头部条）——
 *    否则输入框和滑杆会被节点的 pointerdown 劫持成拖动起点；
 * 3. 拖完 commit 位置到父级（原版位置只活在组件里）—— 原型的画布态要活过路由切换。
 *
 * 沿用的坑：**不能用 setPointerCapture**（会重定向 click）；拖动挂 window；
 * `justDraggedRef` 吞掉拖动后的那次 click —— **以及它同样保护双击**：
 * 拖过的元素不会触发双击，这是想要的行为。
 */
export function PrototypeCanvas({
  elements,
  zoom,
  selectedId,
  onSelect,
  onElementChange,
  onOpenFile,
}: PrototypeCanvasProps) {
  const [dragPositions, setDragPositions] = useState<
    Record<string, { x: number; y: number }>
  >({})
  const [dragSession, setDragSession] = useState<DragSession | null>(null)
  const dragRef = useRef<DragSession | null>(null)
  const justDraggedRef = useRef(false)
  /* 拖动结束要把最终位置交给父级，而 pointerup 的闭包里读不到最新的
     dragPositions（effect 只在 session 变化时重建）—— 所以用 ref 跟最新值。 */
  const positionsRef = useRef(dragPositions)
  positionsRef.current = dragPositions

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>, element: CanvasElement) => {
      if (event.button !== 0) return
      const origin = dragPositions[element.id] ?? { x: element.x, y: element.y }
      justDraggedRef.current = false
      const session: DragSession = {
        elementId: element.id,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: origin.x,
        originY: origin.y,
      }
      dragRef.current = session
      setDragSession(session)
    },
    [dragPositions]
  )

  useEffect(() => {
    if (!dragSession) return
    const scale = zoom / 100

    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      const dx = (event.clientX - drag.startX) / scale
      const dy = (event.clientY - drag.startY) / scale
      if (!justDraggedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
      justDraggedRef.current = true
      setDragPositions((prev) => ({
        ...prev,
        [drag.elementId]: { x: drag.originX + dx, y: drag.originY + dy },
      }))
    }

    const handleUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      dragRef.current = null
      setDragSession(null)
      /* 拖过就把位置交给父级（画布态的唯一真相）。没拖过（纯点击）什么都不做 ——
         选中语义由卡片的 onClick 处理。 */
      if (justDraggedRef.current) {
        const final = positionsRef.current[drag.elementId]
        if (final) onElementChange(drag.elementId, { x: final.x, y: final.y })
      }
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dragPositions 只在 up 时读取一次
  }, [dragSession, zoom])

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute left-0 top-0 size-full origin-top-left"
        style={{ transform: `scale(${zoom / 100})` }}
      >
        {elements.map((element) => {
          const position = dragPositions[element.id] ?? { x: element.x, y: element.y }
          const isDragging = dragSession?.elementId === element.id

          return (
            <div
              key={element.id}
              className="absolute touch-none"
              data-canvas-element={element.id}
              style={{ left: position.x, top: position.y }}
            >
              <CanvasElementCard
                element={element}
                selected={selectedId === element.id}
                dragging={isDragging}
                onHandlePointerDown={(event) => startDrag(event, element)}
                onSelect={() => {
                  if (justDraggedRef.current) return
                  onSelect(element.id)
                }}
                onOpenFile={() => {
                  if (justDraggedRef.current) return
                  onOpenFile(element)
                }}
                onTextChange={(text) => onElementChange(element.id, { text })}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
