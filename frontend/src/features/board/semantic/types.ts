/**
 * 语义画板分析核心——类型定义（S1）
 *
 * 逻辑思路借鉴 SandBoxer 的语义分析管线（语义选择 → 场景图 → 布局质量 →
 * 聚类/意图 → 建议），但为 Lemma Board（tldraw 底座）自研：
 * - 区域数据源是 tldraw shape（知识卡片/概念节点），不是 React Flow node
 * - 分析全部纯 TS（analyzer.ts），LLM 通道走 Lemma 后端（llm.ts 后续层）
 * - 只复用逻辑，不复制任何第三方代码
 */

/** 画布上一个参与分析的形状（tldraw shape 的语义投影） */
export interface BoardShapeInfo {
  id: string
  /** tldraw shape type：knowledgeCard | conceptNode | 未来扩展 */
  type: string
  x: number
  y: number
  width: number
  height: number
  /** 形状文本内容（知识卡片正文 / 概念标签） */
  text: string
  /** 概念节点：掌握度三态（known/learning/due） */
  mastery?: 'known' | 'learning' | 'due'
  /** 该形状连接到的其他形状 id（tldraw binding） */
  connectedIds: string[]
}

/** 用户框选/套索出的分析区域 */
export interface SelectionRegion {
  shapeIds: string[]
  boundingBox: { x: number; y: number; width: number; height: number }
  shapes: BoardShapeInfo[]
  selectionMode: 'rectangle' | 'lasso'
}

/** 布局质量评分（0-1 各项，综合 0-100） */
export interface LayoutQuality {
  overallScore: number
  alignmentScore: number
  distributionScore: number
  overlapScore: number
  hierarchyScore: number
  issues: LayoutIssue[]
}

export interface LayoutIssue {
  type: 'misalignment' | 'overlap' | 'uneven_spacing' | 'orphan_node'
  severity: 'critical' | 'major' | 'minor'
  description: string
  involvedShapeIds: string[]
  fixSuggestion: string
}

/** 语义聚类：把形状按内容主题分组 */
export interface SemanticCluster {
  id: string
  label: string
  shapeIds: string[]
  /** 主题关键词（供 LLM 细化与命名） */
  themes: string[]
  /** 建议布局形态 */
  suggestedArrangement: 'horizontal' | 'vertical' | 'grid' | 'radial' | 'freeform'
}

/** 布局意图（LLM 或规则推断用户想表达什么） */
export interface LayoutIntent {
  description: string
  suggestedArrangement:
    | 'horizontal'
    | 'vertical'
    | 'grid'
    | 'radial'
    | 'freeform'
    | 'hierarchical'
  /** 建议分组：组 id → 成员 shapeIds */
  suggestedGroups: Array<{ groupId: string; label: string; shapeIds: string[] }>
  constraints: Array<{
    type: 'align' | 'distribute' | 'group' | 'order'
    targetIds: string[]
    params: Record<string, unknown>
  }>
  confidence: number
  source: 'llm' | 'rule' | 'fallback'
}

/** 一条可应用的布局建议 */
export interface LayoutSuggestion {
  id: string
  title: string
  description: string
  changes: Array<{
    shapeId: string
    type: 'move' | 'resize' | 'recolor' | 'reorder'
    from: Record<string, unknown>
    to: Record<string, unknown>
  }>
  estimatedImprovement: number
  automatic: boolean
}

/** 一次完整分析的输出 */
export interface BoardAnalysisResult {
  region: SelectionRegion
  quality: LayoutQuality
  clusters: SemanticCluster[]
  intent: LayoutIntent
  suggestions: LayoutSuggestion[]
  /** 规则分析耗时（ms），LLM 层加入后作为整链路统计 */
  processingTimeMs: number
  timestamp: string
}
