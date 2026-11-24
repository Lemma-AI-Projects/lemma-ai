import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import { Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { dotGridBackground } from '@/lib/dotGrid'
import { cn } from '@/lib/utils'
import {
  MAX_SCALE,
  MIN_SCALE,
  fitViewport,
  zoomAround,
  type Viewport,
} from './knowledgeMapViewport'
import type { KnowledgeMapLayout } from './layoutKnowledgeMap'
import { LearnedMark } from './OutlineCardParts'

// 知识地图视图：只读的有向图。前置在上、后学在下，箭头只有一种含义。
//
// 交互只有两件事：
// - 看全局：默认整图适应视口；拖拽平移、捏合 / 按钮缩放，放不下时不强行缩到看不清。
// - 看前置：悬停或点击（点击会固定）一个知识点，它和它直接依赖的前置、以及之间
//   的连线一起高亮（黑边白底，只有一级），其余节点和连线淡出。外部也可以传一组
//   知识点进来高亮（例如悬停某节课）。

const ZOOM_STEP = 1.2
const EDGE_IDLE_COLOR = '#a1a1aa'
const EDGE_ACTIVE_COLOR = '#18181b'
/** 高亮时其余节点、连线的不透明度。 */
const DIMMED_NODE_OPACITY = 0.35
const DIMMED_EDGE_OPACITY = 0.25
/** 生成中逐个浮现用慢一点的淡入；之后的高亮 / 淡出要跟手，越快越好。 */
const REVEAL_DURATION_MS = 300
const HIGHLIGHT_DURATION_MS = 120

export function KnowledgeMapCanvas({
  layout,
  revealedCount,
  focusIds,
  interactive = true,
  wheelPans = false,
  maxFitScale = 1,
  height,
  className,
  onActiveNodeChange,
}: {
  layout: KnowledgeMapLayout
  /** 生成中已浮现的知识点数（按先后顺序）；省略即全部展示。 */
  revealedCount?: number
  /** 外部指定要高亮的知识点（例如悬停了某节课）；节点自身的悬停 / 固定优先。 */
  focusIds?: readonly string[]
  /** 关闭后不能平移缩放，也不显示缩放按钮（生成中）。 */
  interactive?: boolean
  /** 普通滚轮是否平移画布。卡片内不拦滚轮（让页面照常滚动），弹层里才打开。 */
  wheelPans?: boolean
  /** 适应视口时允许放大到的上限；宽画布里可以略大于 1。 */
  maxFitScale?: number
  /** 固定高度（px）；省略时由 className 决定（例如在弹层里 flex-1 撑满）。 */
  height?: number
  className?: string
  onActiveNodeChange?: (nodeId: string | null) => void
}) {
  const markerId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const surfaceRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    x: number
    y: number
    moved: boolean
  } | null>(null)
  /** 用户动过视口后，容器尺寸变化不再自动适应。 */
  const userMovedRef = useRef(false)
  const [viewport, setViewport] = useState<Viewport | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(null)

  // 首次挂载与容器尺寸变化时适应视口（ResizeObserver 在 observe 后会先回调一次）。
  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return undefined
    userMovedRef.current = false
    const observer = new ResizeObserver(() => {
      if (userMovedRef.current) return
      setViewport(
        fitViewport(layout, surface.clientWidth, surface.clientHeight, maxFitScale)
      )
    })
    observer.observe(surface)
    return () => observer.disconnect()
  }, [layout, maxFitScale])

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface || !interactive) return undefined

    const handleWheel = (event: WheelEvent) => {
      // 触控板捏合会产生 ctrlKey wheel。
      const pinch = event.ctrlKey || event.metaKey
      if (!pinch && !wheelPans) return
      event.preventDefault()
      userMovedRef.current = true
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientHeight : 1
      if (pinch) {
        const rect = surface.getBoundingClientRect()
        setViewport(
          (current) =>
            current &&
            zoomAround(
              current,
              Math.exp(-event.deltaY * unit * 0.002),
              event.clientX - rect.left,
              event.clientY - rect.top
            )
        )
      } else {
        setViewport(
          (current) =>
            current && {
              ...current,
              x: current.x - event.deltaX * unit,
              y: current.y - event.deltaY * unit,
            }
        )
      }
    }

    // 非 passive 才能 preventDefault，避免捏合触发浏览器整页缩放。
    surface.addEventListener('wheel', handleWheel, { passive: false })
    return () => surface.removeEventListener('wheel', handleWheel)
  }, [interactive, wheelPans])

  // 悬停优先于固定。把「当前焦点」同步给外部（说明文字、课表联动）放在 effect 里，
  // 而不是散在各个事件回调中：连续触发的指针事件拿到的可能是上一轮渲染的闭包。
  const activeId = hoveredId ?? pinnedId
  useEffect(() => {
    onActiveNodeChange?.(activeId)
  }, [activeId, onActiveNodeChange])

  const highlight = useMemo(() => {
    const targets = activeId ? [activeId] : (focusIds ?? [])
    if (targets.length === 0) return null
    const targetIds = new Set(targets)
    const nodeIds = new Set(targets)
    const edgeIds = new Set<string>()
    for (const edge of layout.edges) {
      if (!targetIds.has(edge.to)) continue
      edgeIds.add(edge.id)
      nodeIds.add(edge.from)
    }
    return { nodeIds, edgeIds }
  }, [activeId, focusIds, layout.edges])

  const revealedIds = useMemo(
    () =>
      revealedCount === undefined
        ? null
        : new Set(layout.nodes.slice(0, revealedCount).map((node) => node.id)),
    [layout.nodes, revealedCount]
  )
  const isRevealed = (nodeId: string) => revealedIds === null || revealedIds.has(nodeId)
  const transitionMs = revealedIds === null ? HIGHLIGHT_DURATION_MS : REVEAL_DURATION_MS

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    // 节点自己接收指针事件；只有落在空白处才开始拖拽。
    if (event.target !== event.currentTarget || dragRef.current) return
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    }
  }

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !interactive) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.moved && Math.hypot(dx, dy) < 3) return
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY, moved: true }
    userMovedRef.current = true
    setIsDragging(true)
    setViewport(
      (current) => current && { ...current, x: current.x + dx, y: current.y + dy }
    )
  }

  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    // 没拖动就是点了一下空白处：取消固定的高亮。
    if (!drag.moved) setPinnedId(null)
  }

  const zoomAtCenter = (factor: number) => {
    const surface = surfaceRef.current
    if (!surface) return
    userMovedRef.current = true
    setViewport(
      (current) =>
        current &&
        zoomAround(current, factor, surface.clientWidth / 2, surface.clientHeight / 2)
    )
  }

  const fitToSurface = () => {
    const surface = surfaceRef.current
    if (!surface) return
    userMovedRef.current = false
    setViewport(
      fitViewport(layout, surface.clientWidth, surface.clientHeight, maxFitScale)
    )
  }

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl bg-zinc-100', className)}
      style={height === undefined ? undefined : { height }}
    >
      <div
        ref={surfaceRef}
        role="group"
        aria-label="知识地图"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        className={cn(
          'absolute inset-0 touch-none select-none',
          interactive && (isDragging ? 'cursor-grabbing' : 'cursor-grab')
        )}
        style={viewport ? dotGridBackground(viewport) : undefined}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 origin-top-left transition-opacity duration-200"
          style={{
            width: layout.width,
            height: layout.height,
            opacity: viewport ? 1 : 0,
            transform: viewport
              ? `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`
              : undefined,
          }}
        >
          <svg
            aria-hidden
            width={layout.width}
            height={layout.height}
            className="absolute left-0 top-0 overflow-visible"
          >
            <defs>
              {(['idle', 'active'] as const).map((state) => (
                // 箭头后缘略微内凹，比实心三角轻一些；连线最后一段是竖直的，
                // 箭头总是正对着节点。
                <marker
                  key={state}
                  id={`${markerId}-${state}`}
                  viewBox="0 0 8 8"
                  markerWidth="7"
                  markerHeight="7"
                  markerUnits="userSpaceOnUse"
                  refX="7.5"
                  refY="4"
                  orient="auto"
                >
                  <path
                    d="M0.5 0.8 L7.5 4 L0.5 7.2 L2.1 4 Z"
                    fill={state === 'active' ? EDGE_ACTIVE_COLOR : EDGE_IDLE_COLOR}
                  />
                </marker>
              ))}
            </defs>
            {/* 高亮的连线画在最上面，不被其他线压住。 */}
            {[...layout.edges]
              .sort(
                (a, b) =>
                  Number(highlight?.edgeIds.has(a.id) ?? false) -
                  Number(highlight?.edgeIds.has(b.id) ?? false)
              )
              .map((edge) => {
                const active = highlight?.edgeIds.has(edge.id) ?? false
                const visible = isRevealed(edge.from) && isRevealed(edge.to)
                return (
                  <path
                    key={edge.id}
                    d={edge.path}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={active ? 1.5 : 1}
                    stroke={active ? EDGE_ACTIVE_COLOR : EDGE_IDLE_COLOR}
                    markerEnd={`url(#${markerId}-${active ? 'active' : 'idle'})`}
                    style={{
                      opacity: !visible
                        ? 0
                        : highlight && !active
                          ? DIMMED_EDGE_OPACITY
                          : 1,
                      transition: `opacity ${transitionMs}ms`,
                    }}
                  />
                )
              })}
          </svg>

          {layout.nodes.map((node) => {
            const revealed = isRevealed(node.id)
            const highlighted = highlight?.nodeIds.has(node.id) ?? false
            const dimmed = highlight !== null && !highlighted

            return (
              <button
                key={node.id}
                type="button"
                tabIndex={revealed ? 0 : -1}
                aria-pressed={pinnedId === node.id}
                title={
                  node.learnedIn ? `已在《${node.learnedIn}》学过` : undefined
                }
                onPointerEnter={() => setHoveredId(node.id)}
                onPointerLeave={() => setHoveredId(null)}
                onFocus={(event) => {
                  if (event.currentTarget.matches(':focus-visible')) {
                    setHoveredId(node.id)
                  }
                }}
                onBlur={() =>
                  setHoveredId((current) => (current === node.id ? null : current))
                }
                onClick={() =>
                  setPinnedId((current) => (current === node.id ? null : node.id))
                }
                className={cn(
                  // 只过渡不透明度和缩放；边框、文字颜色的变化立即生效。
                  'absolute flex cursor-pointer items-center justify-center gap-1 rounded-full border bg-white px-2 text-[12.5px] leading-none whitespace-nowrap outline-none transition-[opacity,scale] focus-visible:ring-2 focus-visible:ring-zinc-300',
                  revealed
                    ? 'pointer-events-auto scale-100'
                    : 'pointer-events-none scale-95',
                  highlighted
                    ? 'border-zinc-900 text-zinc-950 ring-1 ring-zinc-900'
                    : cn(
                        'border-zinc-200',
                        node.learnedIn ? 'text-zinc-500' : 'text-zinc-700'
                      )
                )}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                  opacity: !revealed ? 0 : dimmed ? DIMMED_NODE_OPACITY : 1,
                  transitionDuration: `${transitionMs}ms`,
                }}
              >
                {node.learnedIn ? <LearnedMark /> : null}
                <span className="truncate">{node.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {interactive ? (
        <div
          role="group"
          aria-label="地图缩放"
          className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full border border-zinc-200/80 bg-zinc-50 p-0.5 text-zinc-600"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="缩小"
            title="缩小"
            disabled={!viewport || viewport.scale <= MIN_SCALE}
            onClick={() => zoomAtCenter(1 / ZOOM_STEP)}
            className="rounded-full hover:bg-zinc-200/60"
          >
            <Minus className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label="适应画布"
            title="适应画布"
            onClick={fitToSurface}
            className="h-6 min-w-11 rounded-full px-1.5 text-[11.5px] font-normal tabular-nums hover:bg-zinc-200/60"
          >
            {Math.round((viewport?.scale ?? 1) * 100)}%
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="放大"
            title="放大"
            disabled={!viewport || viewport.scale >= MAX_SCALE}
            onClick={() => zoomAtCenter(ZOOM_STEP)}
            className="rounded-full hover:bg-zinc-200/60"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
