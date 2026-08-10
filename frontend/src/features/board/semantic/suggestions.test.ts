import { describe, expect, it } from 'vitest'

import { generateSuggestions } from './suggestions'
import type { BoardShapeInfo, LayoutIntent, SemanticCluster } from './types'

function shape(id: string, x: number, y: number, text: string): BoardShapeInfo {
  return {
    id,
    type: 'knowledgeCard',
    x,
    y,
    width: 240,
    height: 120,
    text,
    connectedIds: [],
  }
}

const region = (shapes: BoardShapeInfo[]) => ({ shapes })

function analysis(clusters: SemanticCluster[], intent?: Partial<LayoutIntent>) {
  return {
    clusters,
    intent: {
      description: '',
      suggestedArrangement: 'freeform' as const,
      suggestedGroups: [],
      constraints: [],
      confidence: 0.3,
      source: 'fallback' as const,
      ...intent,
    },
  }
}

describe('generateSuggestions', () => {
  it('未对齐形状 → 产出对齐网格建议', () => {
    const shapes = [
      shape('a', 0, 0, '主题甲'),
      shape('b', 13, 0, '主题甲'), // 13 % 8 ≠ 0
      shape('c', 300, 0, '主题乙'),
    ]
    const suggestions = generateSuggestions(region(shapes), analysis([]))
    expect(suggestions.some((s) => s.id === 'align-grid')).toBe(true)
  })

  it('有簇 → 产出分组排布建议', () => {
    const shapes = [
      shape('a', 0, 0, '向量点积'),
      shape('b', 300, 0, '点积几何'),
      shape('c', 600, 200, '矩阵乘法'),
      shape('d', 900, 200, '矩阵性质'),
    ]
    const clusters: SemanticCluster[] = [
      { id: 'c1', label: '点积', shapeIds: ['a', 'b'], themes: ['点积'], suggestedArrangement: 'horizontal' },
      { id: 'c2', label: '矩阵', shapeIds: ['c', 'd'], themes: ['矩阵'], suggestedArrangement: 'horizontal' },
    ]
    const suggestions = generateSuggestions(region(shapes), analysis(clusters))
    const group = suggestions.find((s) => s.id === 'group-layout')
    expect(group).toBeDefined()
    expect(group!.changes.every((c) => c.type === 'move')).toBe(true)
  })

  it('重叠形状 → 产出消除重叠建议', () => {
    const shapes = [
      shape('a', 0, 0, 'x'),
      shape('b', 10, 10, 'y'), // 与 a 大面积重叠
    ]
    const suggestions = generateSuggestions(region(shapes), analysis([]))
    expect(suggestions.some((s) => s.id === 'resolve-overlap')).toBe(true)
  })

  it('完美布局 → 无建议（所有 builder 返回 null）', () => {
    const shapes = [
      shape('a', 0, 0, '甲'),
      shape('b', 248, 0, '乙'), // 对齐网格（248 % 8 = 0）
      shape('c', 0, 128, '丙'),
      shape('d', 248, 128, '丁'),
    ]
    const suggestions = generateSuggestions(region(shapes), analysis([]))
    expect(suggestions).toHaveLength(0)
  })

  it('不超过 MAX_SUGGESTIONS（3 条）', () => {
    const shapes = [
      shape('a', 13, 0, '甲'), // 未对齐
      shape('b', 10, 10, '甲'), // 与 a 重叠
      shape('c', 400, 0, '乙'),
      shape('d', 800, 0, '丙'),
      shape('e', 1200, 0, '丁'),
      shape('f', 1600, 0, '戊'),
    ]
    const clusters: SemanticCluster[] = [
      { id: 'c1', label: '甲', shapeIds: ['a', 'b'], themes: ['甲'], suggestedArrangement: 'horizontal' },
    ]
    const suggestions = generateSuggestions(region(shapes), analysis(clusters))
    expect(suggestions.length).toBeLessThanOrEqual(3)
  })
})
