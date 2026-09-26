/**
 * Emphasis, applied to text that is already on the board.
 *
 * The board's text goes through markdown + KaTeX before it reaches the DOM, so
 * the model cannot express "circle these three characters" as markup — it would
 * have to guess at the renderer's output. Instead the model names the words
 * verbatim (`match`) and this module finds them *after* rendering.
 *
 * Two consequences worth stating, because they are why the design looks like it
 * does:
 *
 * - **The board's text is never rewritten.** Emphasis is a wrapper around what
 *   is already there, so a `match` containing `_`, `$` or `*` is not re-parsed
 *   as markdown, and the words on the board stay exactly the words that were
 *   said.
 * - **A miss is counted, never guessed.** The result tallies wrapped / degraded
 *   / missed, so a caller can assert they add up. Silently dropping a highlight
 *   would be a lie about what the board shows.
 *
 * No coordinates anywhere: placement stays with the layout, and emphasis follows
 * its own words when the text reflows.
 *
 * **Locating is separated from wrapping** on purpose. Finding the words is the
 * part that can be wrong in interesting ways (nth occurrence, a phrase that
 * spans two nodes, a match that is not there at all), and it is pure — so it is
 * unit-tested (`anchors.test.ts`) rather than trusted. The DOM half below it is
 * small enough to read.
 */

import type { BoardMark } from './types'

export interface AnchorResult {
  /** Wrapped exactly the matched text. */
  applied: number
  /** Matched, but split across nodes — the whole element is marked instead. */
  degraded: number
  /** Not found. Counted so a silent failure cannot pass as success. */
  missed: number
}

const MARK_SELECTOR = '[data-board-mark], [data-board-mark-degraded]'

/** Where one source string sits inside the concatenated haystack. */
export interface TextSpan {
  start: number
  end: number
}

/**
 * Concatenate the pieces and remember where each one landed.
 *
 * This is what lets a match cross node boundaries — KaTeX splits `$w_1$` across
 * several spans, and the words a teacher circles can easily straddle that.
 */
export function buildHaystack(pieces: string[]): {
  haystack: string
  spans: TextSpan[]
} {
  const spans: TextSpan[] = []
  let haystack = ''
  for (const piece of pieces) {
    spans.push({ start: haystack.length, end: haystack.length + piece.length })
    haystack += piece
  }
  return { haystack, spans }
}

/** The span containing `offset`, or null when the index is out of range. */
export function resolveSpan(spans: TextSpan[], offset: number): number | null {
  const index = spans.findIndex(
    (span) => offset >= span.start && offset < span.end
  )
  return index === -1 ? null : index
}

/**
 * The byte offsets of the `occurrence`-th `match` in `haystack`.
 *
 * `occurrence` is 0-based and counts non-overlapping hits from the left, so the
 * second "梯度" in a sentence is occurrence 1 regardless of what else repeats.
 * Returns null when there are not that many — a miss, not an error.
 */
export function locateMark(
  haystack: string,
  match: string,
  occurrence: number
): { start: number; end: number } | null {
  if (!match) return null
  const want = Math.max(0, occurrence)
  let from = 0
  for (let seen = 0; seen <= want; seen += 1) {
    const start = haystack.indexOf(match, from)
    if (start === -1) return null
    if (seen === want) return { start, end: start + match.length }
    from = start + match.length
  }
  return null
}

/** Text nodes that are not already inside an emphasis wrapper. */
function textNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let current = walker.nextNode()
  while (current !== null) {
    const node = current as Text
    if (!node.parentElement?.closest(MARK_SELECTOR)) nodes.push(node)
    current = walker.nextNode()
  }
  return nodes
}

function unwrap(element: HTMLElement): void {
  const parent = element.parentNode
  if (!parent) return
  while (element.firstChild) parent.insertBefore(element.firstChild, element)
  parent.removeChild(element)
  // Merge the text nodes the wrapper split apart, so a re-apply finds the same
  // string it did the first time.
  if (parent instanceof HTMLElement) parent.normalize()
}

/** Remove every emphasis under `root`, back to the plain rendered text. */
export function clearMarks(root: HTMLElement): void {
  for (const element of Array.from(root.querySelectorAll(MARK_SELECTOR))) {
    unwrap(element as HTMLElement)
  }
}

/** The nearest element containing the whole occurrence, at or below `root`. */
function commonElement(
  root: HTMLElement,
  startNode: Text,
  endNode: Text
): HTMLElement | null {
  let element: HTMLElement | null = startNode.parentElement
  while (element && element !== root) {
    if (element.contains(endNode)) return element
    element = element.parentElement
  }
  return element === root && root.contains(endNode) ? root : null
}

/**
 * Apply `marks` to the already-rendered content of `root`.
 *
 * Idempotent on purpose: it clears first, so a re-render (or React's
 * double-invoked effects in development) cannot stack two highlights on the same
 * word. Marks are applied one at a time, because wrapping the first one changes
 * the node boundaries the next one searches.
 */
export function applyMarks(root: HTMLElement, marks: BoardMark[]): AnchorResult {
  const result: AnchorResult = { applied: 0, degraded: 0, missed: 0 }
  if (marks.length === 0) return result

  clearMarks(root)
  for (const mark of marks) {
    const match = mark.match?.trim()
    if (!match) {
      result.missed += 1
      continue
    }
    const nodes = textNodes(root)
    const { haystack, spans } = buildHaystack(
      nodes.map((node) => node.nodeValue ?? '')
    )
    const found = locateMark(haystack, match, mark.occurrence)
    if (!found) {
      result.missed += 1
      continue
    }
    // `end - 1`: the last character decides the ending node, so a match that
    // stops exactly at a boundary does not spill into the next element.
    const startIndex = resolveSpan(spans, found.start)
    const endIndex = resolveSpan(spans, found.end - 1)
    if (startIndex === null || endIndex === null) {
      result.missed += 1
      continue
    }
    const startNode = nodes[startIndex]
    const endNode = nodes[endIndex]

    if (startIndex === endIndex) {
      const span = document.createElement('span')
      span.dataset.boardMark = mark.style
      span.className = `board-mark board-mark-${mark.style}`
      const range = document.createRange()
      range.setStart(startNode, found.start - spans[startIndex].start)
      range.setEnd(startNode, found.end - spans[startIndex].start)
      try {
        range.surroundContents(span)
        result.applied += 1
        continue
      } catch {
        // `surroundContents` refuses ranges that straddle element boundaries
        // even within one node's worth of text; fall through to the wider
        // treatment rather than losing the emphasis.
      }
    }
    const target = commonElement(root, startNode, endNode)
    if (!target) {
      result.missed += 1
      continue
    }
    target.dataset.boardMarkDegraded = mark.style
    target.classList.add('board-mark', `board-mark-${mark.style}`, 'board-mark-wide')
    result.degraded += 1
  }
  return result
}
