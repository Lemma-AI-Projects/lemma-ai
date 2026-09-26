import { describe, expect, it } from 'vitest'

import { buildHaystack, locateMark, resolveSpan } from './anchors'

/**
 * The locating half of emphasis. Wrapping needs a DOM (and is exercised in the
 * board sandbox page); deciding *which* characters to wrap is where a mistake
 * would be invisible — a wrong occurrence looks like a deliberate highlight.
 */

describe('locateMark', () => {
  const sentence = '梯度为零不代表最低点，梯度为零只说明地面是平的。'

  it('finds the first occurrence by default', () => {
    expect(locateMark(sentence, '梯度为零', 0)).toEqual({ start: 0, end: 4 })
  })

  it('counts occurrences from the left, non-overlapping', () => {
    const second = locateMark(sentence, '梯度为零', 1)
    expect(second).not.toBeNull()
    expect(sentence.slice(second!.start, second!.end)).toBe('梯度为零')
    expect(second!.start).toBe(sentence.indexOf('梯度为零', 4))
  })

  it('returns null rather than a nearby guess when the occurrence is missing', () => {
    expect(locateMark(sentence, '梯度为零', 2)).toBeNull()
    expect(locateMark(sentence, '二阶导数', 0)).toBeNull()
  })

  it('treats an empty match as a miss, not as the whole string', () => {
    expect(locateMark(sentence, '', 0)).toBeNull()
  })

  it('handles a negative occurrence as the first one', () => {
    expect(locateMark(sentence, '最低点', -1)).toEqual({
      start: sentence.indexOf('最低点'),
      end: sentence.indexOf('最低点') + 3,
    })
  })

  it('does not re-parse markdown or math syntax in the match', () => {
    // The reason emphasis is applied after rendering: a `match` containing
    // `$`/`_`/`*` is just characters to find, never markup to interpret.
    const formula = '公式 w_1 与 $x^2$ 都只是文本。'
    const found = locateMark(formula, '$x^2$', 0)
    expect(found).not.toBeNull()
    expect(formula.slice(found!.start, found!.end)).toBe('$x^2$')
  })
})

describe('buildHaystack / resolveSpan', () => {
  it('concatenates pieces and remembers where each landed', () => {
    const { haystack, spans } = buildHaystack(['梯度', '为零', '不代表最低点'])
    expect(haystack).toBe('梯度为零不代表最低点')
    expect(spans).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
      { start: 4, end: 10 },
    ])
  })

  it('locates a match that straddles two pieces', () => {
    // The KaTeX case: `$w_1$` arrives as several separate text nodes, so the
    // words to circle can easily span a boundary.
    const { haystack, spans } = buildHaystack(['梯度', '为零', '不代表最低点'])
    const found = locateMark(haystack, '度为零', 0)!
    expect(resolveSpan(spans, found.start)).toBe(0)
    expect(resolveSpan(spans, found.end - 1)).toBe(1)
  })

  it('spans more than two pieces when the match is long', () => {
    const { haystack, spans } = buildHaystack(['梯度', '为零', '不代表最低点'])
    const found = locateMark(haystack, '度为零不代表', 0)!
    expect(resolveSpan(spans, found.start)).toBe(0)
    expect(resolveSpan(spans, found.end - 1)).toBe(2)
  })

  it('keeps a match that ends exactly at a boundary inside the last piece', () => {
    // `end - 1` is why: the final character decides the ending node, so the
    // emphasis does not spill into the next element.
    const { haystack, spans } = buildHaystack(['梯度', '为零', '不代表最低点'])
    const found = locateMark(haystack, '梯度为零', 0)!
    expect(resolveSpan(spans, found.end - 1)).toBe(1)
  })

  it('returns null for an offset past the end', () => {
    const { haystack, spans } = buildHaystack(['ab'])
    expect(resolveSpan(spans, haystack.length)).toBeNull()
  })
})
