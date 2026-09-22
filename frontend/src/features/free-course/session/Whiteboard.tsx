/**
 * The whiteboard: a 1000x600 SVG that draws whatever the action stream has
 * accumulated so far.
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

import { memo, useMemo } from 'react'

import { cn } from '@/lib/utils'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  jittered,
  type BoardElement,
  type BoardMarkElement,
  type BoardShapeElement,
  type BoardTextElement,
} from './board'
import type { BoardColor, BoardSize } from './types'

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
@media (prefers-reduced-motion: reduce) {
  .board-write, .board-draw { animation-duration: 1ms; }
}
`

export const Whiteboard = memo(function Whiteboard({
  elements,
  className,
}: {
  elements: BoardElement[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative size-full overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950',
        className
      )}
      data-board-actions={elements.length}
    >
      <style>{BOARD_CSS}</style>
      <svg
        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="size-full"
        role="img"
        aria-label="教学白板"
      >
        {elements.map((element) => elementOf(element))}
      </svg>
    </div>
  )
})
