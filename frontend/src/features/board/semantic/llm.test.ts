import { describe, expect, it } from 'vitest'

import { buildBoardSemanticRequest, mergeSemanticEnrichment } from './llm'
import type { SemanticCluster } from './types'

const clusters: SemanticCluster[] = [
  {
    id: 'cluster-1',
    label: '点积',
    shapeIds: ['a', 'b'],
    themes: ['点积'],
    suggestedArrangement: 'horizontal',
  },
  {
    id: 'cluster-2',
    label: '矩阵',
    shapeIds: ['c', 'd'],
    themes: ['矩阵'],
    suggestedArrangement: 'horizontal',
  },
]

describe('buildBoardSemanticRequest', () => {
  it('载荷裁剪：只传 id/text/type/mastery，不传坐标', () => {
    const req = buildBoardSemanticRequest(
      [
        { id: 'a', text: '点积的定义', type: 'knowledgeCard', mastery: 'learning' },
        { id: 'b', text: '点积几何', type: 'knowledgeCard', mastery: null },
      ],
      clusters
    )
    expect(req.shapes[0]).toEqual({
      id: 'a',
      text: '点积的定义',
      type: 'knowledgeCard',
      mastery: 'learning',
    })
    expect(req.shapes[1]).not.toHaveProperty('x')
    expect(req.shapes[1]).not.toHaveProperty('y')
    expect(req.shapes[1]).not.toHaveProperty('mastery') // null → 省略
    expect(req.clusters[0]).toEqual({
      id: 'cluster-1',
      memberIds: ['a', 'b'],
      label: '点积',
    })
  })
})

describe('mergeSemanticEnrichment', () => {
  it('命中 clusterId 覆盖 label；未命中保持规则 label', () => {
    const merged = mergeSemanticEnrichment(clusters, {
      clusters: [
        {
          clusterId: 'cluster-1',
          label: '线性代数 · 向量基础',
          description: '向量运算',
        },
      ],
      intentDescription: '检测到 2 个知识主题，建议按主题分组',
    })
    expect(merged.enrichedClusters[0]!.label).toBe('线性代数 · 向量基础')
    expect(merged.enrichedClusters[1]!.label).toBe('矩阵') // 未命中保持
    expect(merged.intentDescription).toBe('检测到 2 个知识主题，建议按主题分组')
  })

  it('无 intent 描述 → null', () => {
    const merged = mergeSemanticEnrichment(clusters, {
      clusters: [],
      intentDescription: '',
    })
    expect(merged.intentDescription).toBeNull()
  })
})
