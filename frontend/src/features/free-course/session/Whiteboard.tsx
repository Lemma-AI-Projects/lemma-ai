/**
 * The whiteboard. It renders one of two boards, and which one is not a setting:
 *
 * - **Blocks** (current plans) — content flows top to bottom at a fixed width,
 *   so blocks cannot overlap. Placement is the renderer's job; the model only
 *   says what each block is. A `figure` block is still drawn by the code below
 *   (same strokes, same animations), inside its own box.
 * - **Legacy board** (plans written before blocks) — one absolute 1000x600 SVG
 *   drawing whatever the action stream accumulated. Kept exactly as it was, so
 *   those sessions still replay.
 *
 * The old description of the legacy path, still true of it:
 *
 * Three deliberate choices, all in service of "this looks like a person wrote
 * it, and it is still visibly a screen":
 *
 * 1. **Handwriting is a font, not an image.** Latin falls back to the system
 *    script faces (Segoe Print / Bradley Hand), Chinese to 楷体, which is what
 *    an installed Windows machine actually has. No webfont request, no
 *    licensing question, and it still reads as a hand.
 * 2. **Text is revealed by a sweeping clip, not typed out.** A real hand moves
 *    left to right at a roughly constant speed; a per-character typewriter
 *    effect looks like a terminal. The clip width is what makes it look written.
 * 3. **Strokes are drawn with the dash trick and wobbled by a hash of the
 *    element key.** The wobble is deterministic, so replaying the same plan
 *    draws the same line — "the board changed" stays meaningful.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AssistantMarkdown } from '@/features/conversation/markdown'
import { cn } from '@/lib/utils'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  FIGURE_HEIGHT,
  FIGURE_WIDTH,
  boundsOf,
  jittered,
  type BoardBlockView,
  type BoardElement,
  type BoardMarkElement,
  type BoardShapeElement,
  type BoardTextElement,
} from './board'
import type { BoardColor, BoardSize } from './types'
import type { ReactNode } from 'react'

/** The reference product's accent, per planning/hyperknow-visual-style-research.html. */
const COLORS: Record<BoardColor, string> = {
  ink: '#3f3f46',
  accent: '#4c6694',
  muted: '#a1a1aa',
  danger: '#dc2626',
  highlight: '#f2c94c',
}

const FONT_SIZE: Record<BoardSize, { write: number; label: number }> = {
  s: { write: 16, label: 14 },
  m: { write: 22, label: 17 },
  l: { write: 32, label: 22 },
  xl: { write: 42, label: 26 },
}

const STROKE_WIDTH: Record<BoardSize, number> = { s: 1.6, m: 2.4, l: 3.2, xl: 4 }

const HAND_FONT =
  "'Segoe Print','Bradley Hand','Comic Sans MS',KaiTi,STKaiti,'Noto Serif SC',cursive"
const MATH_FONT = "'Cambria Math',Cambria,Georgia,serif"

/** Catmull-Rom through the points -> one cubic path. Curves arrive as samples. */
function smoothPath(points: { x: number; y: number }[], closed: boolean): string {
  if (points.length < 2) return ''
  const pts = closed ? [...points, points[0]] : points
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d +=
      ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)},` +
      ` ${c2x.toFixed(2)} ${c2y.toFixed(2)},` +
      ` ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  if (closed) d += ' Z'
  return d
}

function translate(element: BoardElement): string | undefined {
  if (element.dx === 0 && element.dy === 0) return undefined
  return `translate(${element.dx.toFixed(1)}px, ${element.dy.toFixed(1)}px)`
}

function transition(element: BoardElement): string | undefined {
  return element.durationMs > 0
    ? `transform ${element.durationMs}ms cubic-bezier(.4,0,.2,1)`
    : undefined
}

function BoardText({ element }: { element: BoardTextElement }) {
  const fontSize = FONT_SIZE[element.size][element.variant]
  // Writing time scales with the text, capped so a long label does not crawl.
  const duration = Math.min(1400, Math.max(320, element.text.length * 55))
  return (
    <g
      style={{ transform: translate(element), transition: transition(element) }}
    >
      <text
        x={element.x}
        y={element.y}
        fill={COLORS[element.color]}
        fontSize={fontSize}
        fontFamily={element.variant === 'write' ? HAND_FONT : MATH_FONT}
        fontWeight={element.variant === 'write' ? 500 : 400}
        className="board-write"
        style={{ ['--board-write' as string]: `${duration}ms` }}
      >
        {element.text}
      </text>
    </g>
  )
}

function BoardShapeElementView({ element }: { element: BoardShapeElement }) {
  const points = useMemo(
    () => jittered(element.points, element.key, element.shape === 'curve' ? 3 : 1.6),
    [element.points, element.key, element.shape]
  )
  const stroke = COLORS[element.color]
  const width = STROKE_WIDTH[element.size]
  const filled = element.shape === 'dot' || element.shape === 'circle'
  const d = smoothPath(points, element.closed)

  const head = element.shape === 'arrow' ? arrowHead(points) : null

  return (
    <g
      style={{ transform: translate(element), transition: transition(element) }}
    >
      <path
        d={d}
        fill={filled ? stroke : 'none'}
        stroke={stroke}
        strokeWidth={filled ? 0 : width}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={filled ? undefined : 1}
        className={filled ? undefined : 'board-draw'}
        style={
          filled
            ? undefined
            : {
                ['--board-len' as string]: '1',
                ['--board-draw' as string]: `${Math.min(
                  1200,
                  Math.max(360, points.length * 45)
                )}ms`,
              }
        }
      />
      {head && (
        <path
          d="M -9 -6 L 0 0 L -9 6"
          fill="none"
          stroke={stroke}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={`translate(${head.x} ${head.y}) rotate(${head.angle})`}
          className="board-write"
          style={{ ['--board-write' as string]: '220ms' }}
        />
      )}
    </g>
  )
}

function arrowHead(points: { x: number; y: number }[]): { x: number; y: number; angle: number } {
  const end = points[points.length - 1]
  const prev = points[points.length - 2] ?? points[0]
  return {
    x: end.x,
    y: end.y,
    angle: (Math.atan2(end.y - prev.y, end.x - prev.x) * 180) / Math.PI,
  }
}

function BoardMark({ element }: { element: BoardMarkElement }) {
  const points = useMemo(
    () => jittered(element.points, element.key, 4),
    [element.points, element.key]
  )
  return (
    <g style={{ transform: translate(element) }}>
      <path
        d={smoothPath(points, false)}
        fill="none"
        stroke={COLORS.highlight}
        strokeWidth={22}
        strokeLinecap="round"
        strokeOpacity={0.42}
        pathLength={1}
        strokeDasharray={1}
        className="board-draw"
        style={{
          ['--board-len' as string]: '1',
          ['--board-draw' as string]: '420ms',
        }}
      />
    </g>
  )
}

function elementOf(element: BoardElement) {
  if (element.kind === 'text') return <BoardText key={element.key} element={element} />
  if (element.kind === 'mark') return <BoardMark key={element.key} element={element} />
  return <BoardShapeElementView key={element.key} element={element} />
}

/**
 * 「等他来点」的那个元素。
 *
 * 被观察到的产品在白板上放了一个可点的圆圈：点了才出现下一段板书与下一道题。
 * 这里做三件必须一起做的事，少一件这个交互就成立不了：
 *
 * 1. **给足命中面积** —— 模型标的往往是 9 个单位的圆点，直接用它的几何形状当
 *    热区，人点不中。所以按元素包围盒补一块透明的矩形。
 * 2. **看得出可以点** —— 等待时有一圈呼吸的提示环 + 指针光标。
 * 3. **点下去立刻有反应** —— 一圈扩散出去，而不是等下一个动作才开始。原文里
 *    点击本身就是"画布出现红色圆圈动画"的触发点。
 */
function ClickableElement({
  element,
  onActivate,
  children,
}: {
  element: BoardElement
  onActivate: () => void
  children: ReactNode
}) {
  const [flashed, setFlashed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    []
  )

  const activate = useCallback(() => {
    if (flashed) return
    setFlashed(true)
    onActivate()
    timer.current = setTimeout(() => setFlashed(false), 700)
  }, [flashed, onActivate])

  const box = boundsOf(element)
  const center = box
    ? { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    : { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 }
  const radius = box ? Math.max(28, Math.hypot(box.width, box.height) / 2 + 16) : 40
  const pad = 14

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label="点一下它"
      className="board-target cursor-pointer"
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          activate()
        }
      }}
    >
      <circle
        cx={center.x}
        cy={center.y}
        r={radius}
        fill="none"
        stroke={COLORS.accent}
        strokeWidth={2}
        strokeOpacity={0.5}
        className="board-ripple"
      />
      {flashed && (
        <circle
          cx={center.x}
          cy={center.y}
          r={radius}
          fill="none"
          stroke={COLORS.danger}
          strokeWidth={3}
          className="board-flash"
        />
      )}
      {box && (
        <rect
          x={box.x - pad}
          y={box.y - pad}
          width={box.width + pad * 2}
          height={box.height + pad * 2}
          fill="transparent"
        />
      )}
      {children}
    </g>
  )
}

/** The stylesheet that makes "written" and "drawn" possible. Kept local. */
const BOARD_CSS = `
.board-write {
  clip-path: inset(0 100% 0 0);
  animation: board-write var(--board-write, 700ms) linear both;
}
@keyframes board-write {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0 0 0); }
}
.board-draw {
  stroke-dashoffset: var(--board-len, 1);
  animation: board-draw var(--board-draw, 800ms) ease-out both;
}
@keyframes board-draw {
  from { stroke-dashoffset: var(--board-len, 1); }
  to   { stroke-dashoffset: 0; }
}
/* 等待点击：呼吸的提示环。说不出口的那句"它在等我点一下"，靠这个说。 */
.board-ripple {
  transform-box: fill-box;
  transform-origin: center;
  animation: board-ripple 1.8s ease-in-out infinite;
}
@keyframes board-ripple {
  0%, 100% { opacity: .35; }
  50%      { opacity: .95; }
}
/* 点下去的那一下：一圈扩散出去。 */
.board-flash {
  transform-box: fill-box;
  transform-origin: center;
  animation: board-flash 700ms ease-out both;
}
@keyframes board-flash {
  from { opacity: .9; transform: scale(.6); }
  to   { opacity: 0;  transform: scale(1.5); }
}
.board-target:focus-visible {
  outline: 2px solid #4c6694;
  outline-offset: 3px;
  border-radius: 6px;
}
/* 块入场：整块淡入上浮，不是打字机。 */
.board-block-in {
  animation: board-block-in 380ms cubic-bezier(.2,.8,.2,1) both;
}
@keyframes board-block-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}
/* 标题仍然「写出来」：从左往右扫过，块里唯一保留手写感的那一笔。 */
.board-sweep {
  clip-path: inset(0 100% 0 0);
  animation: board-sweep 620ms linear both;
}
@keyframes board-sweep {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0 0 0); }
}
@media (prefers-reduced-motion: reduce) {
  .board-write, .board-draw, .board-block-in, .board-sweep { animation-duration: 1ms; }
  .board-ripple { animation: none; opacity: .8; }
}
`

/** One figure's own SVG box — the same drawing code, a smaller coordinate space. */
function FigureBox({
  view,
  clickTarget,
  onElementClick,
}: {
  view: BoardBlockView
  clickTarget?: string | null
  onElementClick?: (key: string) => void
}) {
  // The wait is per figure: only one block can be waiting at a time, so the
  // local element key is unambiguous.
  const waiting =
    view.clickKey && view.clickKey === clickTarget ? view.clickKey : null
  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: `${FIGURE_WIDTH} / ${FIGURE_HEIGHT}` }}
      data-board-figure
    >
      <svg
        viewBox={`0 0 ${FIGURE_WIDTH} ${FIGURE_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="size-full"
        role="img"
        aria-label={view.block.caption ?? '图示'}
      >
        {view.elements.map((element) => {
          if (!waiting || element.key !== waiting) return elementOf(element)
          return (
            <ClickableElement
              key={`${element.key}~click`}
              element={element}
              onActivate={() => onElementClick?.(element.key)}
            >
              {elementOf(element)}
            </ClickableElement>
          )
        })}
      </svg>
    </div>
  )
}

/**
 * One block of board content.
 *
 * Prose goes through the same markdown renderer the conversation uses — which is
 * where KaTeX and tables already work — while the *chrome* (headings, terms,
 * captions) keeps the hand font. That split is deliberate: a formula has to look
 * like a formula, and KaTeX brings its own fonts, so forcing handwriting on the
 * prose would fight the math for the same glyphs.
 */
function BlockCard({
  view,
  clickTarget,
  onElementClick,
}: {
  view: BoardBlockView
  clickTarget?: string | null
  onElementClick?: (key: string) => void
}) {
  const block = view.block
  switch (block.kind) {
    case 'heading':
      return (
        <h3
          className="board-sweep text-[25px] font-medium leading-9 tracking-tight text-zinc-900 dark:text-zinc-100"
          style={{ fontFamily: HAND_FONT }}
        >
          {block.text}
        </h3>
      )
    case 'text':
      return (
        <AssistantMarkdown
          inlineMath
          className="text-[16px] leading-7 text-zinc-800 [&_p]:my-0 dark:text-zinc-200"
        >
          {block.text ?? ''}
        </AssistantMarkdown>
      )
    case 'bullets':
      return (
        <ul className="flex flex-col gap-1">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-2.5">
              <span
                aria-hidden
                className="mt-[10px] size-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600"
              />
              <AssistantMarkdown
                inlineMath
                className="text-[15.5px] leading-7 text-zinc-800 [&_p]:my-0 dark:text-zinc-200"
              >
                {item}
              </AssistantMarkdown>
            </li>
          ))}
        </ul>
      )
    case 'definition':
      return (
        <div className="border-l-2 border-zinc-300 pl-3 dark:border-zinc-700">
          <p
            className="text-[16px] font-medium text-zinc-900 dark:text-zinc-100"
            style={{ fontFamily: HAND_FONT }}
          >
            {block.term}
          </p>
          <AssistantMarkdown
            inlineMath
            className="text-[15px] leading-7 text-zinc-700 [&_p]:my-0 dark:text-zinc-300"
          >
            {block.meaning ?? ''}
          </AssistantMarkdown>
        </div>
      )
    case 'formula': {
      const latex = block.text ?? ''
      return (
        <div className="flex w-full justify-center py-1">
          <AssistantMarkdown className="text-[17px] text-zinc-900 [&_p]:my-0 dark:text-zinc-100">
            {`$$\n${latex}\n$$`}
          </AssistantMarkdown>
        </div>
      )
    }
    case 'table':
      return (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-[14.5px]">
            <thead>
              <tr>
                {block.columns.map((column, index) => (
                  <th
                    key={index}
                    className="border-b border-zinc-300 px-2.5 py-1.5 text-left font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border-b border-zinc-200/70 px-2.5 py-1.5 align-top text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'figure':
      return (
        <figure className="flex w-full flex-col gap-1.5">
          <FigureBox
            view={view}
            clickTarget={clickTarget}
            onElementClick={onElementClick}
          />
          {block.caption ? (
            <figcaption
              className="text-center text-[12.5px] text-zinc-500 dark:text-zinc-400"
              style={{ fontFamily: HAND_FONT }}
            >
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      )
    default:
      return null
  }
}

export const Whiteboard = memo(function Whiteboard({
  elements,
  blocks,
  className,
  clickTarget,
  onElementClick,
}: {
  /** The legacy board's elements (plans written before blocks). */
  elements: BoardElement[]
  /** Block-contract content. Non-empty -> this board renders instead. */
  blocks?: BoardBlockView[]
  className?: string
  /** The element the timeline is waiting for a click on, if any. */
  clickTarget?: string | null
  onElementClick?: (key: string) => void
}) {
  const blockList = blocks ?? []
  const usesBlocks = blockList.length > 0
  return (
    <div
      className={cn(
        'relative size-full overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950',
        className
      )}
      data-board-mode={usesBlocks ? 'blocks' : 'legacy'}
      data-board-actions={usesBlocks ? blockList.length : elements.length}
    >
      <style>{BOARD_CSS}</style>
      {usesBlocks ? (
        // The board scrolls inside its own frame: content only grows, and the
        // viewport stays put (that was the agreed board shape).
        <div className="scrollbar-fade h-full overflow-y-auto px-6 py-6">
          <div
            className="mx-auto flex w-full max-w-[38rem] flex-col gap-5"
            data-board-flow
          >
            {blockList.map((view) => (
              <div
                key={view.key}
                className="board-block-in"
                data-board-block={view.block.kind}
              >
                <BlockCard
                  view={view}
                  clickTarget={clickTarget}
                  onElementClick={onElementClick}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="size-full"
          role="img"
          aria-label="教学白板"
        >
          {elements.map((element) => {
            if (!clickTarget || element.key !== clickTarget) return elementOf(element)
            return (
              <ClickableElement
                key={`${element.key}~click`}
                element={element}
                onActivate={() => onElementClick?.(element.key)}
              >
                {elementOf(element)}
              </ClickableElement>
            )
          })}
        </svg>
      )}
    </div>
  )
})
