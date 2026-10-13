import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MalaChips } from './MalaChips'
import { totalItems, visibleChips, type MalaBundleChip } from './malaChipsOps'

const noop = () => undefined

function chip(id: string, itemCount: number, label: string | null = null): MalaBundleChip {
  return { id, itemCount, label }
}

describe('visibleChips', () => {
  it('四个以内全露，一个不收', () => {
    const chips = [chip('a', 1), chip('b', 2), chip('c', 3), chip('d', 4)]
    expect(visibleChips(chips)).toEqual({ shown: chips, overflow: 0 })
  })

  it('超出的收成 +N，而且前四个顺序不变', () => {
    const chips = [chip('a', 1), chip('b', 2), chip('c', 3), chip('d', 4), chip('e', 5), chip('f', 6)]
    const { shown, overflow } = visibleChips(chips)
    expect(shown.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(overflow).toBe(2)
  })

  it('空列表不收不减', () => {
    expect(visibleChips([])).toEqual({ shown: [], overflow: 0 })
  })
})

describe('totalItems', () => {
  it('把各组的块数加起来 —— 这是"我到底带了多少东西"的答案', () => {
    expect(totalItems([chip('a', 3), chip('b', 5), chip('c', 1)])).toBe(9)
  })

  it('空列表是 0，不是 NaN', () => {
    expect(totalItems([])).toBe(0)
  })
})

describe('MalaChips（静态断言）', () => {
  const chips = [chip('a', 3, '第一组'), chip('b', 2)]

  it('没有材料包时什么都不渲染', () => {
    expect(renderToStaticMarkup(<MalaChips chips={[]} onRemove={noop} />)).toBe('')
  })

  it('每个 chip 带一个可点的撤掉按钮（aria-label 说明撤的是哪组）', () => {
    const markup = renderToStaticMarkup(<MalaChips chips={chips} onRemove={noop} />)
    expect(markup).toContain('aria-label="撤掉第一组"')
    expect(markup).toContain('aria-label="撤掉第 2 组"')
    // 按钮数量 = chip 数量，不能多也不能少
    expect(markup.match(/aria-label="撤掉/g)?.length).toBe(2)
  })

  it('显示总计：几组、几块', () => {
    const markup = renderToStaticMarkup(<MalaChips chips={chips} onRemove={noop} />)
    expect(markup).toContain('圈了 2 组 · 5 块')
  })

  it('超出的收起来，且露出一个 +N 而不是把排挤爆', () => {
    const many = Array.from({ length: 7 }, (_, i) => chip(`b${i}`, 1))
    const markup = renderToStaticMarkup(<MalaChips chips={many} onRemove={noop} />)
    expect(markup).toContain('+3 组')
    expect(markup.match(/aria-label="撤掉/g)?.length).toBe(4)
  })
})
