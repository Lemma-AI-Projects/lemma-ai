import { describe, expect, it } from 'vitest'

import {
  PDF_MAX_SCALE,
  PDF_MIN_SCALE,
  clampPage,
  clampScale,
  fitScale,
  pageLabel,
  stepZoom,
} from './pdfView'

describe('PDF 阅读器的算术', () => {
  it('按容器宽度适配：容器 800、页宽 400 → 2 倍', () => {
    expect(fitScale(800, 400)).toBe(2)
  })

  it('容器还没量出宽度（0）时退回 1，而不是算出 0 缩放', () => {
    expect(fitScale(0, 400)).toBe(1)
    expect(fitScale(800, 0)).toBe(1)
  })

  it('适配结果也被夹进可用区间', () => {
    expect(fitScale(99999, 1)).toBe(PDF_MAX_SCALE)
  })

  it('缩放一档放大 / 缩小，且始终夹紧', () => {
    expect(stepZoom(1, 1)).toBeCloseTo(1.25)
    expect(stepZoom(1, -1)).toBeCloseTo(0.8)
    expect(stepZoom(PDF_MAX_SCALE, 1)).toBe(PDF_MAX_SCALE)
    expect(stepZoom(PDF_MIN_SCALE, -1)).toBe(PDF_MIN_SCALE)
  })

  it('页码夹进 [0, count-1]', () => {
    expect(clampPage(-3, 6)).toBe(0)
    expect(clampPage(99, 6)).toBe(5)
    expect(clampPage(2.9, 6)).toBe(2)
    expect(clampPage(3, 0)).toBe(0)
  })

  it('页码标签是 1 基的', () => {
    expect(pageLabel(2, 6)).toBe('3 / 6')
    expect(pageLabel(99, 6)).toBe('6 / 6')
  })

  it('clampScale 遇到非有限数退回 1', () => {
    expect(clampScale(Number.NaN)).toBe(1)
    expect(clampScale(Number.POSITIVE_INFINITY)).toBe(1)
  })
})
