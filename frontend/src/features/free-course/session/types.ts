/**
 * Wire shapes for a teaching session (Hyperknow-style board + voice).
 *
 * Mirrors schemas/free_course.py one-for-one. Two things are deliberately
 * absent, and they are absent for the same reason the lesson read omits them:
 * a question never carries `answer` / `expected`. Grading a Quick Check happens
 * on the server, so the correct option must not be sitting in this response.
 */

export type BoardActionKind =
  | 'write'
  | 'draw'
  | 'label'
  | 'highlight'
  | 'move'
  | 'pause'
  /**
   * 「等他来点」：时间线停在这里，直到学习者点了 `target` 指的那个元素。
   * 被观察到的那个产品就是这样——白板上有个可点的圆圈，点了才出现下一段板书。
   */
  | 'awaitClick'

export type BoardShape =
  | 'line'
  | 'arrow'
  | 'curve'
  | 'rect'
  | 'circle'
  | 'dot'
  | 'axis'

export type BoardColor = 'ink' | 'accent' | 'muted' | 'danger' | 'highlight'

export type BoardSize = 's' | 'm' | 'l' | 'xl'

/** Board coordinates are an abstract 1000x600 space, never pixels. */
export interface BoardPoint {
  x: number
  y: number
}

export interface BoardAction {
  kind: BoardActionKind
  at?: BoardPoint | null
  to?: BoardPoint | null
  points?: BoardPoint[]
  shape?: BoardShape | null
  /** write / label 是它写的字；awaitClick 是等的时候屏幕上的提示语。 */
  text?: string | null
  color: BoardColor
  size: BoardSize
  /** Set only when something can move this element later. */
  id?: string | null
  target?: string | null
  durationMs?: number | null
  /** Index of the narration sentence this action belongs to. */
  cue: number
}

/**
 * One block of board content. Shape is the contract: `kind` says which fields
 * matter. Placement is deliberately absent — the board flows blocks top to
 * bottom at a fixed width, so a block cannot collide with its neighbour.
 * `figure` is the only kind carrying geometry, in 0..1 coordinates *inside its
 * own block* (what makes "the teacher still draws" and "the renderer places"
 * both true).
 */
export type BoardBlockKind =
  | 'heading'
  | 'text'
  | 'bullets'
  | 'definition'
  | 'table'
  | 'formula'
  | 'figure'

export type BoardMarkStyle = 'highlight' | 'circle' | 'underline'

/**
 * Emphasis on text this block already shows.
 *
 * `match` is copied verbatim out of the block, and the renderer finds it in the
 * rendered DOM — which is why the board's text never gets rewritten by emphasis
 * and why `match` containing `_`, `$` or `*` is not re-parsed as markdown. The
 * mark is metadata about the text, not part of it.
 */
export interface BoardMark {
  style: BoardMarkStyle
  /** Verbatim text from the same block. */
  match: string
  /** Which occurrence of `match` in that block (0 = first). */
  occurrence: number
  cue: number
  /** figure only: anchor to a drawn element instead of to text. */
  target?: string | null
}

export interface BoardBlock {
  kind: BoardBlockKind
  /** Index of the narration sentence this block appears on — the sync contract. */
  cue: number
  text?: string | null
  items: string[]
  term?: string | null
  meaning?: string | null
  columns: string[]
  rows: string[][]
  caption?: string | null
  /** figure only: draw primitives in 0..1 block-local coordinates. */
  actions: BoardAction[]
  /** Emphasis on this block's own text. */
  marks: BoardMark[]
  color?: BoardColor | null
}

export interface TeachingQuestion {
  kind: 'open' | 'choice'
  prompt: string
  options: { id: string; text: string }[]
  hint?: string | null
}

export interface TeachingStep {
  id: string
  title?: string | null
  branch?: string | null
  narration: string
  /**
   * The board for this beat. New plans carry `blocks`; plans written before the
   * block contract carry only `actions` and still play through the legacy path.
   */
  blocks?: BoardBlock[]
  actions: BoardAction[]
  question?: TeachingQuestion | null
}

/** What produced a step — drives whether the board is wiped before it plays. */
export type TeachingBranch = 'intro' | 'continue' | 'reteach' | 'answer' | 'check'

export interface SessionTranscriptEntry {
  stepId: string
  signal: 'answer' | 'confused' | 'interrupt'
  text?: string | null
  optionId?: string | null
  verdict?: string | null
  feedback?: string | null
}

export interface TeachingSession {
  sessionId: string
  chapterId: string
  title: string
  objective: string
  status: string
  /**
   * Index of the next step to play. Not "how many steps exist": a turn can
   * append several, and only the learner's playback moves this forward.
   */
  cursor: number
  steps: TeachingStep[]
  transcript: SessionTranscriptEntry[]
  /** False when the chapter has no generated lesson yet — nothing to teach. */
  hasContent: boolean
}

export interface TeachingTurnResult {
  verdict?: string | null
  feedback?: string | null
  /** 只在答对时出现：以概念命名的一张成就卡（原文 "Loss Function as a Landscape"）。 */
  award?: string | null
  steps: TeachingStep[]
  cursor: number
}

export interface SessionProgressInput {
  cursor: number
}

/** The three things a learner can do at a stopping point. */
export type SessionSignalKind = 'answer' | 'confused' | 'interrupt'
