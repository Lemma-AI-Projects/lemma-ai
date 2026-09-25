/**
 * The board's state, derived from the action stream.
 *
 * A teaching step is not a picture — it is a sequence of small things a teacher
 * does, and the board is whatever those things have accumulated into. So the
 * board is *replayed*, never authored: `applyAction` folds one action into the
 * element list, and the renderer draws the list. Nothing here knows about React
 * or about time; the player calls it, and that is the whole contract.
 *
 * **Two layers live here**, deliberately rather than transitionally:
 *
 * - **Blocks** (`applyBlockCue`) — the current contract. The model says *what*
 *   the board shows (a heading, a table, a figure) and the renderer decides
 *   where: blocks flow top to bottom at a fixed width, so two of them cannot
 *   collide. A `figure` block still carries geometry, but in 0..1 coordinates
 *   *inside its own box*, which this module maps onto the same abstract 1000x600
 *   space as before — so every drawing helper below is reused unchanged.
 * - **Actions** (`applyAction`) — the pre-block contract, kept so sessions
 *   planned before the change still replay. It positions everything in absolute
 *   1000x600 coordinates, which is exactly what made text overlap.
 *
 * Coordinates are the server's abstract 1000x600 space. Keeping them as numbers
 * rather than pixels is what lets the same plan play on a laptop and a
 * projector, and it is why the jitter below is deterministic: the same plan must
 * look the same twice, or "the board changed" would stop meaning anything.
 */

import type {
  BoardAction,
  BoardBlock,
  BoardColor,
  BoardPoint,
  BoardShape,
  BoardSize,
} from './types'

export interface BoardTextElement {
  key: string
  kind: 'text'
  variant: 'write' | 'label'
  x: number
  y: number
  text: string
  color: BoardColor
  size: BoardSize
  /** Added order — the renderer staggers reveals by it. */
  seq: number
  /** Translation applied by a later `move` (board units). */
  dx: number
  dy: number
  durationMs: number
}

export interface BoardShapeElement {
  key: string
  kind: 'shape'
  shape: BoardShape
  points: BoardPoint[]
  closed: boolean
  color: BoardColor
  size: BoardSize
  seq: number
  dx: number
  dy: number
  durationMs: number
}

export interface BoardMarkElement {
  key: string
  kind: 'mark'
  /** The marker stroke, as a polyline through these points. */
  points: BoardPoint[]
  seq: number
  dx: number
  dy: number
  durationMs: number
}

export type BoardElement = BoardTextElement | BoardShapeElement | BoardMarkElement

export const BOARD_WIDTH = 1000
export const BOARD_HEIGHT = 600

/** A dot with no `to` still needs a size to be visible. */
const DOT_RADIUS = 9
const CIRCLE_RADIUS = 42
/** How far an `axis` extends when the model only gives an origin. */
const AXIS_EXTENT = 320

/**
 * Deterministic 0..1 noise from a string. Used to make a curve look drawn by a
 * hand rather than plotted — and, because it is a hash of the element's key, the
 * same plan draws the same wobble every time it is replayed.
 */
function noise(seed: string, index: number): number {
  let hash = 2166136261
  const text = `${seed}:${index}`
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash >>> 0) % 1000) / 1000
}

/** Push a point off its exact position, by an amount scaled to the stroke. */
function wobble(point: BoardPoint, seed: string, index: number, amount = 2.2): BoardPoint {
  return {
    x: point.x + (noise(seed, index * 2) - 0.5) * amount,
    y: point.y + (noise(seed, index * 2 + 1) - 0.5) * amount,
  }
}

function jittered(points: BoardPoint[], seed: string, amount = 2.2): BoardPoint[] {
  return points.map((point, index) => wobble(point, seed, index, amount))
}

function geometry(action: BoardAction): { points: BoardPoint[]; closed: boolean } {
  const at = action.at ?? null
  const to = action.to ?? null
  const given = action.points ?? []
  switch (action.shape) {
    case 'curve':
      return { points: given.length >= 2 ? given : at && to ? [at, to] : [], closed: false }
    case 'line':
    case 'arrow':
      return { points: at && to ? [at, to] : given, closed: false }
    case 'rect': {
      if (at && to) {
        return {
          points: [
            { x: at.x, y: at.y },
            { x: to.x, y: at.y },
            { x: to.x, y: to.y },
            { x: at.x, y: to.y },
          ],
          closed: true,
        }
      }
      return { points: given, closed: true }
    }
    case 'circle': {
      if (!at) return { points: given, closed: true }
      const radius = to
        ? Math.hypot(to.x - at.x, to.y - at.y)
        : CIRCLE_RADIUS
      const points: BoardPoint[] = []
      const steps = 36
      for (let index = 0; index <= steps; index += 1) {
        const angle = (index / steps) * Math.PI * 2
        points.push({
          x: at.x + Math.cos(angle) * radius,
          y: at.y + Math.sin(angle) * radius,
        })
      }
      return { points, closed: true }
    }
    case 'dot': {
      if (!at) return { points: given, closed: true }
      const radius = to ? Math.hypot(to.x - at.x, to.y - at.y) : DOT_RADIUS
      const points: BoardPoint[] = []
      const steps = 20
      for (let index = 0; index <= steps; index += 1) {
        const angle = (index / steps) * Math.PI * 2
        points.push({
          x: at.x + Math.cos(angle) * radius,
          y: at.y + Math.sin(angle) * radius,
        })
      }
      return { points, closed: true }
    }
    case 'axis': {
      // An L through the origin: horizontal to `to.x`, vertical to `to.y`. Two
      // strokes, one element, because "draw me axes" is one thing to say.
      if (!at) return { points: given, closed: false }
      // Only the horizontal stick here; axisCompanion() adds the vertical one.
      const extendX = to ? to.x : at.x + AXIS_EXTENT
      return {
        points: [
          { x: at.x, y: at.y },
          { x: extendX, y: at.y },
        ],
        closed: false,
      }
    }
    default:
      return { points: given, closed: false }
  }
}

function axisCompanion(action: BoardAction): BoardPoint[] {
  const at = action.at
  if (!at) return []
  const extendY = action.to ? action.to.y : at.y - AXIS_EXTENT
  return [
    { x: at.x, y: at.y },
    { x: at.x, y: extendY },
  ]
}

export function applyAction(
  elements: BoardElement[],
  action: BoardAction,
  seq: number
): BoardElement[] {
  // Neither of these draws anything: `pause` is a beat, `awaitClick` is a wait
  // (the player handles it). Keeping them out of here means the board stays a
  // pure function of the actions that DO draw.
  if (action.kind === 'pause' || action.kind === 'awaitClick') return elements

  if (action.kind === 'write' || action.kind === 'label') {
    const text = (action.text ?? '').trim()
    if (!text || !action.at) return elements
    return [
      ...elements,
      {
        key: action.id || `text-${seq}`,
        kind: 'text',
        variant: action.kind === 'label' ? 'label' : 'write',
        x: action.at.x,
        y: action.at.y,
        text,
        color: action.color,
        size: action.size,
        seq,
        dx: 0,
        dy: 0,
        durationMs: 0,
      },
    ]
  }

  if (action.kind === 'highlight') {
    const points =
      (action.points ?? []).length >= 2
        ? (action.points as BoardPoint[])
        : action.at && action.to
          ? [action.at, action.to]
          : action.at
            ? [
                { x: action.at.x, y: action.at.y },
                { x: action.at.x + 220, y: action.at.y },
              ]
            : []
    if (points.length < 2) return elements
    return [
      ...elements,
      {
        key: action.id || `mark-${seq}`,
        kind: 'mark',
        points,
        seq,
        dx: 0,
        dy: 0,
        durationMs: 0,
      },
    ]
  }

  if (action.kind === 'draw') {
    const { points, closed } = geometry(action)
    if (points.length === 0) return elements
    const element: BoardShapeElement = {
      key: action.id || `shape-${seq}`,
      kind: 'shape',
      shape: action.shape ?? 'line',
      points,
      closed,
      color: action.color,
      size: action.size,
      seq,
      dx: 0,
      dy: 0,
      durationMs: 0,
    }
    if (action.shape !== 'axis') return [...elements, element]
    // Axes are two strokes; the companion carries no id of its own so a `move`
    // naming the axis cannot move half of it.
    const companion: BoardShapeElement = {
      ...element,
      key: `${element.key}~y`,
      points: axisCompanion(action),
    }
    return [...elements, element, companion]
  }

  if (action.kind === 'move') {
    const target = action.target || action.id
    if (!target) return elements
    const index = elements.findIndex((element) => element.key === target)
    if (index === -1) return elements
    const element = elements[index]
    const from = action.at ?? null
    const to = action.to ?? null
    if (!to) return elements
    // With no `at`, move by a delta; with one, move to the absolute point. Both
    // are in board units so neither depends on where the element was drawn.
    const current = firstPoint(element)
    const dx = current ? to.x - current.x : to.x
    const dy = current ? to.y - current.y : to.y
    void from
    const next: BoardElement = {
      ...element,
      dx: element.dx + dx,
      dy: element.dy + dy,
      durationMs: action.durationMs ?? 1600,
    }
    const copy = [...elements]
    copy[index] = next
    return copy
  }

  return elements
}

/**
 * The bounding box of an element in board units — used to give a small shape a
 * clickable area a human can actually hit. Without it, "click the dot" means
 * hitting a 9-unit circle.
 */
export function boundsOf(element: BoardElement): {
  x: number
  y: number
  width: number
  height: number
} | null {
  if (element.kind === 'text') {
    // Rough glyph metrics: the font size is in board units per line, and a CJK
    // glyph is about one em wide.
    const size = element.size === 's' ? 16 : element.size === 'l' ? 32 : element.size === 'xl' ? 42 : 22
    return {
      x: element.x + element.dx,
      y: element.y - size + element.dy,
      width: Math.max(size, element.text.length * size),
      height: size * 1.3,
    }
  }
  if (element.points.length === 0) return null
  const xs = element.points.map((point) => point.x + element.dx)
  const ys = element.points.map((point) => point.y + element.dy)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return { x: minX, y: minY, width: Math.max(1, Math.max(...xs) - minX), height: Math.max(1, Math.max(...ys) - minY) }
}

function firstPoint(element: BoardElement): BoardPoint | null {
  if (element.kind === 'text') return { x: element.x + element.dx, y: element.y + element.dy }
  if (element.points.length > 0) {
    const point = element.points[0]
    return { x: point.x + element.dx, y: point.y + element.dy }
  }
  return null
}

export { jittered }

// --- blocks (the current contract) ------------------------------------------

/**
 * A figure's own drawing box. It is the same abstract 1000x600 space the legacy
 * board used, which is why nothing about drawing had to change: the block-local
 * 0..1 coordinates are mapped onto this box, and every helper below works on it
 * exactly as before (bounds, jitter, stroke widths, the Catmull-Rom smoothing).
 */
export const FIGURE_WIDTH = BOARD_WIDTH
export const FIGURE_HEIGHT = BOARD_HEIGHT

export interface BoardBlockView {
  key: string
  cue: number
  block: BoardBlock
  /** figure only: what has been drawn inside it so far, in its own box. */
  elements: BoardElement[]
  /** figure only: element-key counter, so a figure that grows keeps stable keys. */
  seq: number
  /** figure only: the element this figure is waiting for a click on (local key). */
  clickKey: string | null
  clickHint: string | null
}

export interface BoardBlockState {
  blocks: BoardBlockView[]
}

export const EMPTY_BLOCK_STATE: BoardBlockState = { blocks: [] }

/** Keys must be stable across replays: the same block gets the same key. */
function blockKey(block: BoardBlock, index: number): string {
  return `${block.kind}-${block.cue}-${index}`
}

function mapPoint(point: BoardPoint): BoardPoint {
  return { x: point.x * FIGURE_WIDTH, y: point.y * FIGURE_HEIGHT }
}

/** Block-local 0..1 geometry -> the figure's own box. */
function mapAction(action: BoardAction): BoardAction {
  return {
    ...action,
    at: action.at ? mapPoint(action.at) : null,
    to: action.to ? mapPoint(action.to) : null,
    points: (action.points ?? []).map(mapPoint),
  }
}

function foldFigure(
  view: BoardBlockView,
  cue: number,
  { catchUp = false }: { catchUp?: boolean } = {}
): BoardBlockView {
  if (view.block.kind !== 'figure') return view
  const batch = view.block.actions.filter((action) => {
    const actionCue = Math.max(0, action.cue)
    return catchUp ? actionCue <= cue : actionCue === cue
  })
  if (batch.length === 0) return view
  let elements = view.elements
  let seq = view.seq
  let clickKey = view.clickKey
  let clickHint = view.clickHint
  for (const action of batch) {
    if (action.kind === 'awaitClick') {
      clickKey = action.target ?? clickKey
      clickHint = action.text ?? clickHint
      continue
    }
    seq += 1
    elements = applyAction(elements, mapAction(action), seq)
  }
  return { ...view, elements, seq, clickKey, clickHint }
}

/**
 * Fold one cue of a step's blocks into the board.
 *
 * For the cue that just arrived: blocks carrying that cue appear, in the order
 * the model gave them, and inside every figure the actions carrying that cue are
 * drawn. So a figure can grow and animate across sentences exactly like a legacy
 * board could, while its *position* stays with the layout.
 *
 * A newly revealed figure catches up on **all** its actions up to this cue: the
 * model may well write the figure's cue on the caption while the geometry sits
 * on earlier sentences ("show the curve, then name it"), and dropping those
 * would leave an empty box.
 */
export function applyBlockCue(
  state: BoardBlockState,
  blocks: BoardBlock[] | undefined,
  cue: number
): BoardBlockState {
  const next = state.blocks.map((view) => foldFigure(view, cue))
  const known = new Set(next.map((view) => view.key))
  ;(blocks ?? []).forEach((block, index) => {
    if (block.cue !== cue) return
    const key = blockKey(block, index)
    if (known.has(key)) return
    known.add(key)
    next.push(
      foldFigure(
        {
          key,
          cue: block.cue,
          block,
          elements: [],
          seq: 0,
          clickKey: null,
          clickHint: null,
        },
        cue,
        { catchUp: true }
      )
    )
  })
  return { blocks: next }
}

/**
 * The figure waiting for a click in this cue, if any — the player pauses there.
 * Returned separately from the state because the wait has to happen *after* the
 * cue's drawing lands, and because a state updater cannot hand back a value.
 */
export function figureWaitAt(
  blocks: BoardBlock[] | undefined,
  cue: number
): { target: string | null; hint: string | null } | null {
  for (const block of blocks ?? []) {
    if (block.kind !== 'figure') continue
    const waits = block.actions.filter(
      (action) => action.kind === 'awaitClick' && Math.max(0, action.cue) === cue
    )
    const wait = waits[waits.length - 1]
    if (wait) return { target: wait.target ?? null, hint: wait.text ?? null }
  }
  return null
}

/** Whether a plan uses the block contract at all (drives which board renders). */
export function planUsesBlocks(
  steps: { blocks?: BoardBlock[] }[] | undefined
): boolean {
  return Boolean(steps?.some((step) => (step.blocks?.length ?? 0) > 0))
}
