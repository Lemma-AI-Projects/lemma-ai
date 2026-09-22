/**
 * Narration -> sentences. This is the timeline's unit, and it must agree
 * exactly with `split_sentences` in ai/free_course/teaching/planner.py.
 *
 * Why it must agree: every board action carries `cue`, the index of the
 * narration sentence it belongs to. If the server clamped a cue against a
 * 5-sentence split and the client splits the same text into 4, the board fires
 * on the wrong beat — the failure mode is silent and looks like "the board is
 * lagging", which is exactly the impression this feature cannot afford.
 *
 * The rule (identical in both languages):
 *   - a hard break at 。！？!?… , and at every newline;
 *   - ASCII "." ends a sentence ONLY when whitespace or end-of-string follows,
 *     because narration is full of decimals and abbreviations ("x = 0.5",
 *     "e.g.") that would otherwise become beats too short to hear.
 */

const SENTENCE_END = '。！？!?…'

export function splitSentences(text: string): string[] {
  const out: string[] = []
  let buffer = ''
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '\n') {
      const piece = buffer.trim()
      if (piece) out.push(piece)
      buffer = ''
      continue
    }
    buffer += char
    const ends =
      SENTENCE_END.includes(char) ||
      (char === '.' &&
        (index + 1 >= text.length || /\s/.test(text[index + 1])))
    if (ends) {
      const piece = buffer.trim()
      if (piece) out.push(piece)
      buffer = ''
    }
  }
  const tail = buffer.trim()
  if (tail) out.push(tail)
  return out.length > 0 ? out : text.trim() ? [text.trim()] : []
}
