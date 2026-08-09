import { describe, expect, it } from 'vitest'

import {
  analyzeRegion,
  assessLayoutQuality,
  clusterByKeywords,
  extractKeywords,
  inferIntentByRules,
} from './analyzer'
import type { BoardShapeInfo, SelectionRegion } from './types'

function shape(partial: Partial<BoardShapeInfo> & { id: string }): BoardShapeInfo {
  return {
    type: 'knowledgeCard',
    x: 0,
    y: 0,
    width: 240,
    height: 120,
    text: '',
    connectedIds: [],
    ...partial,
  }
}

function region(shapes: BoardShapeInfo[]): SelectionRegion {
  return {
    shapeIds: shapes.map((s) => s.id),
    boundingBox: { x: 0, y: 0, width: 1000, height: 1000 },
    shapes,
    selectionMode: 'rectangle',
  }
}

describe('extractKeywords', () => {
  it('英文按空格切词 + 去停用词', () => {
    const tokens = extractKeywords('the quick brown fox')
    expect(tokens).toContain('quick')
    expect(tokens).not.toContain('the')
  })

  it('中文无空格 → 返回整句（2-gram 共现兜底聚类）', () => {
    // 中文无分词器时不做假切分；聚类层用 textOverlap 的 2-gram 兜底
    expect(extractKeywords('向量点积')).toEqual(['向量点积'])
  })
})

describe('assessLayoutQuality', () => {
  it('空区域 = 满分', () => {
    const q = assessLayoutQuality([])
    expect(q.overallScore).toBe(100)
    expect(q.issues).toHaveLength(0)
  })

  it('对齐网格的形状得分高，偏移形状产生 misalignment', () => {
    const q = assessLayoutQuality([
      shape({ id: 'a', x: 0, y: 0 }),
      shape({ id: 'b', x: 8, y: 0 }),
      shape({ id: 'c', x: 13, y: 0 }), // 13 % 8 ≠ 0 → 未对齐
      shape({ id: 'd', x: 24, y: 0 }),
      shape({ id: 'e', x: 37, y: 0 }), // 37 % 8 ≠ 0 → 未对齐
      shape({ id: 'f', x: 41, y: 0 }), // 41 % 8 ≠ 0 → 未对齐
    ])
    // 6 个形状，3 个对齐 → 0.5 不 < 0.5（阈值严格小于）→ 不产生 issue
    expect(q.alignmentScore).toBeCloseTo(3 / 6)
    expect(q.issues.some((i) => i.type === 'misalignment')).toBe(false)

    // 若偏移更多（2/6 对齐 = 0.33 < 0.5）→ 产生 issue
    const worse = assessLayoutQuality([
      shape({ id: 'a', x: 0, y: 0 }),
      shape({ id: 'b', x: 9, y: 0 }),
      shape({ id: 'c', x: 13, y: 0 }),
      shape({ id: 'd', x: 24, y: 0 }),
      shape({ id: 'e', x: 37, y: 0 }),
      shape({ id: 'f', x: 41, y: 0 }),
    ])
    expect(worse.issues.some((i) => i.type === 'misalignment')).toBe(true)
  })

  it('重叠形状产生 overlap issue', () => {
    const q = assessLayoutQuality([
      shape({ id: 'a', x: 0, y: 0 }),
      shape({ id: 'b', x: 10, y: 10 }), // 与 a 大面积重叠
    ])
    expect(q.overlapScore).toBeLessThan(1)
    expect(q.issues.some((i) => i.type === 'overlap')).toBe(true)
  })

  it('均匀分布得分高于零散分布', () => {
    const even = assessLayoutQuality([
      shape({ id: 'a', x: 0, y: 0 }),
      shape({ id: 'b', x: 260, y: 0 }),
      shape({ id: 'c', x: 520, y: 0 }),
    ])
    const uneven = assessLayoutQuality([
      shape({ id: 'a', x: 0, y: 0 }),
      shape({ id: 'b', x: 300, y: 0 }),
      shape({ id: 'c', x: 310, y: 0 }),
    ])
    expect(even.distributionScore).toBeGreaterThan(uneven.distributionScore)
  })
})

describe('clusterByKeywords', () => {
  it('共享关键词的形状聚为一簇，无关形状不聚类', () => {
    const shapes = [
      shape({ id: 'a', text: '向量点积的定义' }),
      shape({ id: 'b', text: '点积的几何意义' }),
      shape({ id: 'c', text: '矩阵乘法的性质' }),
    ]
    const clusters = clusterByKeywords(shapes)
    expect(clusters.length).toBeGreaterThanOrEqual(1)
    // a 与 b 都含「点积」，应同在至少一簇
    const clusterWithA = clusters.find((c) => c.shapeIds.includes('a'))
    expect(clusterWithA?.shapeIds).toContain('b')
  })

  it('少于 2 成员的组不成簇', () => {
    const shapes = [
      shape({ id: 'a', text: '量子纠缠' }),
      shape({ id: 'b', text: '烤蛋糕的化学' }),
    ]
    expect(clusterByKeywords(shapes)).toHaveLength(0)
  })
})

describe('inferIntentByRules', () => {
  it('多簇 → grid 分组', () => {
    const shapes = [
      shape({ id: 'a', text: '线性代数 向量 矩阵' }),
      shape({ id: 'b', text: '线性代数 行列式' }),
      shape({ id: 'c', text: '微积分 导数 极限' }),
      shape({ id: 'd', text: '微积分 积分' }),
    ]
    const clusters = clusterByKeywords(shapes)
    const intent = inferIntentByRules(shapes, clusters)
    expect(intent.suggestedArrangement).toBe('grid')
    expect(intent.source).toBe('rule')
  })

  it('有连接 → hierarchical', () => {
    const shapes = [
      shape({ id: 'a', text: '基础', connectedIds: ['b'] }),
      shape({ id: 'b', text: '进阶' }),
    ]
    const intent = inferIntentByRules(shapes, [])
    expect(intent.suggestedArrangement).toBe('hierarchical')
  })

  it('无分组无连接 → freeform fallback', () => {
    const shapes = [
      shape({ id: 'a', text: '完全无关的主题甲' }),
      shape({ id: 'b', text: '完全无关的主题乙' }),
    ]
    const intent = inferIntentByRules(shapes, [])
    expect(intent.suggestedArrangement).toBe('freeform')
    expect(intent.source).toBe('fallback')
  })
})

describe('analyzeRegion', () => {
  it('端到端产出质量/聚类/意图', () => {
    const result = analyzeRegion(
      region([
        shape({ id: 'a', x: 0, y: 0, text: '向量点积定义' }),
        shape({ id: 'b', x: 260, y: 0, text: '点积几何意义' }),
        shape({ id: 'c', x: 520, y: 0, text: '点积应用实例' }),
      ])
    )
    expect(result.quality.overallScore).toBeGreaterThan(0)
    expect(result.clusters.length).toBeGreaterThanOrEqual(1)
    expect(result.intent.confidence).toBeGreaterThan(0)
  })
})
