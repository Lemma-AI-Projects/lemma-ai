import { describe, expect, it } from 'vitest'

import {
  projectShapesToRegion,
  shapeAABB,
  shapeText,
  type AdapterShape,
} from './tldraw-adapter'

function card(
  id: string,
  x: number,
  y: number,
  text: string,
  extra: Partial<AdapterShape> = {}
): AdapterShape {
  return {
    id,
    type: 'knowledgeCard',
    x,
    y,
    rotation: 0,
    props: { w: 240, h: 120, text, mastery: 'learning' },
    ...extra,
  }
}

describe('shapeText', () => {
  it('knowledgeCard 取 props.text', () => {
    expect(shapeText(card('a', 0, 0, '向量点积'))).toBe('向量点积')
  })

  it('conceptNode 取 props.label', () => {
    expect(shapeText({ id: 'b', type: 'conceptNode', x: 0, y: 0, props: { label: '矩阵' } })).toBe('矩阵')
  })

  it('未知类型兜底空串', () => {
    expect(shapeText({ id: 'c', type: 'box', x: 0, y: 0, props: {} })).toBe('')
  })
})

describe('shapeAABB', () => {
  it('rotation 0 → 原始尺寸', () => {
    expect(shapeAABB(card('a', 0, 0, ''))).toEqual({ width: 240, height: 120 })
  })

  it('rotation 45° → 外接矩形扩大（AABB 保守）', () => {
    const box = shapeAABB(card('a', 0, 0, '', { rotation: Math.PI / 4 }))
    // cos45≈0.707, sin45≈0.707 → w' = 240*0.707+120*0.707 ≈ 254.6
    expect(box.width).toBeGreaterThan(240)
    expect(box.height).toBeGreaterThan(120)
  })
})

describe('projectShapesToRegion', () => {
  it('空输入 → 空区域', () => {
    const r = projectShapesToRegion({ shapes: [], bindings: [] })
    expect(r.shapeIds).toHaveLength(0)
    expect(r.boundingBox.width).toBe(0)
  })

  it('混合 shape 类型 + text/mastery 投影正确', () => {
    const r = projectShapesToRegion({
      shapes: [
        card('a', 0, 0, '向量点积'),
        { id: 'b', type: 'conceptNode', x: 300, y: 0, props: { w: 140, h: 140, label: '矩阵', mastery: 'known' } },
      ],
      bindings: [],
    })
    expect(r.shapes).toHaveLength(2)
    expect(r.shapes[0]).toMatchObject({ id: 'a', text: '向量点积', mastery: 'learning' })
    expect(r.shapes[1]).toMatchObject({ id: 'b', text: '矩阵', mastery: 'known' })
  })

  it('boundingBox 覆盖全部 shape', () => {
    const r = projectShapesToRegion({
      shapes: [card('a', 10, 20, 'x'), card('b', 500, 400, 'y')],
      bindings: [],
    })
    // a: x=10..250, y=20..140 ; b: x=500..740, y=400..520
    expect(r.boundingBox.x).toBe(10)
    expect(r.boundingBox.y).toBe(20)
    expect(r.boundingBox.width).toBe(740 - 10)
    expect(r.boundingBox.height).toBe(520 - 20)
  })

  it('bindings 推导 connectedIds（双向）', () => {
    const r = projectShapesToRegion({
      shapes: [card('a', 0, 0, ''), card('b', 300, 0, '')],
      bindings: [{ fromId: 'a', toId: 'b' }],
    })
    expect(r.shapes[0]!.connectedIds).toContain('b')
    expect(r.shapes[1]!.connectedIds).toContain('a')
  })

  it('自环 binding 忽略', () => {
    const r = projectShapesToRegion({
      shapes: [card('a', 0, 0, '')],
      bindings: [{ fromId: 'a', toId: 'a' }],
    })
    expect(r.shapes[0]!.connectedIds).toHaveLength(0)
  })
})
