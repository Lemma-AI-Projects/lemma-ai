/**
 * 语义画板分析核心——规则分析器（S1，纯 TS）
 *
 * 逻辑思路借鉴 SandBoxer 的布局质量评估与聚类，但为 Lemma 知识画布
 * （知识卡片/概念节点）自研实现：
 * - 布局质量：对齐 / 分布 / 重叠 / 层级四维评分（0-1）+ 问题清单
 * - 规则聚类：按文本关键词重合度做贪心分组（主题共享即同簇）
 * - 意图推断：规则可推断的布局意图（fallback 给 LLM 层补充语义命名）
 *
 * 不依赖 tldraw、不依赖 React、不依赖 LLM——纯函数，可独立单测。
 */

import type {
  BoardShapeInfo,
  LayoutIntent,
  LayoutIssue,
  LayoutQuality,
  SelectionRegion,
  SemanticCluster,
} from './types'

/** 文本关键词提取：小写、按分隔符切词、去停用词（中文 + 英文） */
const STOPWORDS = new Set([
  '的', '了', '是', '在', '和', '与', '或', '及', '这', '那', '就', '也',
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'it', 'this', 'that',
])
const SPLIT_RE = /[\s,，。.;:：!?！？()（）\[\]【】{}<>/\\\-_+]+/

export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(SPLIT_RE)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token))
}

/** 两个形状的内容关键词重叠度（Jaccard），用于聚类 */
function keywordOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  let intersection = 0
  for (const token of setA) {
    if (setB.has(token)) intersection += 1
  }
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * 中文无空格分词——Jaccard 精确匹配对「点积的定义」vs「点积的几何意义」
 * 失效（token 完全不同）。补一层字符级共现：任一句的任意 2-gram 出现在
 * 另一句即算一次交集，捕捉中文主题共享。
 */
function textOverlap(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')
  const sa = norm(a)
  const sb = norm(b)
  if (sa.length < 2 || sb.length < 2) return 0
  const gramsA = new Set<string>()
  for (let i = 0; i + 2 <= sa.length; i += 1) {
    gramsA.add(sa.slice(i, i + 2))
  }
  let hits = 0
  for (let i = 0; i + 2 <= sb.length; i += 1) {
    if (gramsA.has(sb.slice(i, i + 2))) hits += 1
  }
  return hits / Math.max(gramsA.size, 1)
}

/** 重叠阈值：低于此值不视为同簇 */
const CLUSTER_OVERLAP_THRESHOLD = 0.12
/** 同簇最小成员数（低于此值不形成簇，散落为 freeform） */
const CLUSTER_MIN_MEMBERS = 2
/** 2-gram 共现阈值：低于此值不并入簇 */
const CLUSTER_GRAM_THRESHOLD = 0.08

/**
 * 布局质量评估（0-1 各项）
 *
 * - alignment：形状边界与画布网格/主轴对齐的比例（量化到 8px 网格）
 * - distribution：同一轴向上相邻间距的均匀度（变异系数取反）
 * - overlap：无重叠比例（两矩形相交面积 > 阈值即算重叠）
 * - hierarchy：有连接关系的形状是否满足"被指向者位于主方向"的层级感
 */
export function assessLayoutQuality(shapes: BoardShapeInfo[]): LayoutQuality {
  const issues: LayoutIssue[] = []
  const n = shapes.length
  if (n === 0) {
    return {
      overallScore: 100,
      alignmentScore: 1,
      distributionScore: 1,
      overlapScore: 1,
      hierarchyScore: 1,
      issues: [],
    }
  }

  // ── 对齐（snap 到 8px 网格的比例）────────────────────────────
  const GRID = 8
  const aligned = shapes.filter(
    (s) => s.x % GRID === 0 && s.y % GRID === 0
  ).length
  const alignmentScore = aligned / n
  if (alignmentScore < 0.5) {
    issues.push({
      type: 'misalignment',
      severity: alignmentScore < 0.3 ? 'critical' : 'major',
      description: `${n - aligned}/${n} 个形状未对齐到网格`,
      involvedShapeIds: shapes
        .filter((s) => s.x % GRID !== 0 || s.y % GRID !== 0)
        .map((s) => s.id),
      fixSuggestion: '将形状吸附到 8px 网格（对齐 x/y）',
    })
  }

  // ── 重叠（相交面积 > 10% 视为重叠）───────────────────────────
  function rectsOverlap(a: BoardShapeInfo, b: BoardShapeInfo): boolean {
    const ix = Math.max(
      0,
      Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
    )
    const iy = Math.max(
      0,
      Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
    )
    const inter = ix * iy
    const area = Math.min(a.width * a.height, b.width * b.height)
    return area > 0 && inter / area > 0.1
  }
  const overlapping: Array<[BoardShapeInfo, BoardShapeInfo]> = []
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (rectsOverlap(shapes[i]!, shapes[j]!)) {
        overlapping.push([shapes[i]!, shapes[j]!])
      }
    }
  }
  const overlapScore = 1 - overlapping.length / Math.max(n - 1, 1)
  if (overlapping.length > 0) {
    issues.push({
      type: 'overlap',
      severity: overlapping.length > 2 ? 'critical' : 'major',
      description: `${overlapping.length} 对形状相互重叠`,
      involvedShapeIds: [...new Set(overlapping.flatMap(([a, b]) => [a.id, b.id]))],
      fixSuggestion: '为重叠形状启用自动排布（避免遮挡）',
    })
  }

  // ── 分布（X 轴间距均匀度：变异系数越小越均匀）──────────────────
  const xs = shapes.map((s) => s.x).sort((a, b) => a - b)
  const gaps: number[] = []
  for (let i = 1; i < xs.length; i += 1) {
    gaps.push(xs[i]! - xs[i - 1]!)
  }
  const meanGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length
  const variance =
    meanGap === 0
      ? 0
      : gaps.reduce((sum, g) => sum + (g - meanGap) ** 2, 0) / gaps.length
  const cv = meanGap === 0 ? 0 : Math.sqrt(variance) / meanGap
  const distributionScore = Math.max(0, 1 - cv)
  if (cv > 0.8 && gaps.length >= 3) {
    issues.push({
      type: 'uneven_spacing',
      severity: cv > 1.2 ? 'major' : 'minor',
      description: '形状水平间距不均匀',
      involvedShapeIds: shapes.map((s) => s.id),
      fixSuggestion: '按主轴等距分布（distribute）',
    })
  }

  // ── 层级（有连接的形状，被指向者应在指向者右下方向）────────────
  const connected = shapes.filter((s) => s.connectedIds.length > 0)
  let hierarchical = 0
  let total = 0
  for (const s of connected) {
    const targets = shapes.filter((t) => s.connectedIds.includes(t.id))
    for (const t of targets) {
      total += 1
      // 层级感：目标在右下（读序自然流向）
      if (t.x >= s.x - 4 && t.y >= s.y - 4) hierarchical += 1
    }
  }
  const hierarchyScore = total === 0 ? 1 : hierarchical / total
  if (total > 0 && hierarchyScore < 0.6) {
    issues.push({
      type: 'orphan_node',
      severity: 'minor',
      description: '部分连接的形状流向不符合读序（右/下）',
      involvedShapeIds: connected.map((s) => s.id),
      fixSuggestion: '调整连接方向或布局，使知识流自上而下/自左而右',
    })
  }

  const overallScore = Math.round(
    (alignmentScore + distributionScore + overlapScore + hierarchyScore) * 25
  )
  return {
    overallScore,
    alignmentScore,
    distributionScore,
    overlapScore,
    hierarchyScore,
    issues,
  }
}

/**
 * 规则聚类：贪心分组——首个形状起组，其后形状与组内任一模版
 * 关键词重叠超过阈值即并入。返回主题簇（<2 成员不形成簇）。
 */
export function clusterByKeywords(shapes: BoardShapeInfo[]): SemanticCluster[] {
  const tokens = new Map<string, string[]>(
    shapes.map((s) => [s.id, extractKeywords(s.text)])
  )
  const clusters: SemanticCluster[] = []
  const assigned = new Set<string>()

  for (const seed of shapes) {
    if (assigned.has(seed.id)) continue
    const seedTokens = tokens.get(seed.id) ?? []
    const members = [seed]
    assigned.add(seed.id)

    for (const other of shapes) {
      if (assigned.has(other.id)) continue
      const otherTokens = tokens.get(other.id) ?? []
      const overlap = keywordOverlap(seedTokens, otherTokens)
      // 中文无空格场景：词级 Jaccard 可能为 0，用 2-gram 共现兜底
      const gramOverlap = textOverlap(seed.text, other.text)
      if (overlap >= CLUSTER_OVERLAP_THRESHOLD || gramOverlap >= CLUSTER_GRAM_THRESHOLD) {
        members.push(other)
        assigned.add(other.id)
      }
    }

    if (members.length >= CLUSTER_MIN_MEMBERS) {
      // 簇主题 = 成员关键词并集的 top 3
      const freq = new Map<string, number>()
      for (const m of members) {
        for (const token of tokens.get(m.id) ?? []) {
          freq.set(token, (freq.get(token) ?? 0) + 1)
        }
      }
      const themes = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([token]) => token)
      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        label: themes[0] ?? '未命名主题',
        shapeIds: members.map((m) => m.id),
        themes,
        suggestedArrangement:
          members.length >= 5 ? 'grid' : members.length >= 3 ? 'horizontal' : 'freeform',
      })
    }
  }
  return clusters
}

/**
 * 规则意图推断：由簇结构推导布局意图（LLM 层未启用时兜底）。
 * 单簇 → 水平排列；多簇 → 分组网格；有连接 → 层级（hierarchical）。
 */
export function inferIntentByRules(
  shapes: BoardShapeInfo[],
  clusters: SemanticCluster[]
): LayoutIntent {
  const connected = shapes.some((s) => s.connectedIds.length > 0)
  const suggestedGroups = clusters.map((c) => ({
    groupId: c.id,
    label: c.label,
    shapeIds: c.shapeIds,
  }))

  if (suggestedGroups.length > 1) {
    return {
      description: `检测到 ${suggestedGroups.length} 个主题组，建议按组排布`,
      suggestedArrangement: 'grid',
      suggestedGroups,
      constraints: suggestedGroups.map((g) => ({
        type: 'group' as const,
        targetIds: g.shapeIds,
        params: { groupId: g.groupId },
      })),
      confidence: 0.6,
      source: 'rule',
    }
  }
  if (connected) {
    return {
      description: '检测到形状间连接关系，建议层级排布',
      suggestedArrangement: 'hierarchical',
      suggestedGroups,
      constraints: [{ type: 'order', targetIds: shapes.map((s) => s.id), params: {} }],
      confidence: 0.55,
      source: 'rule',
    }
  }
  if (clusters.length === 1) {
    return {
      description: '单一主题组，建议水平排列',
      suggestedArrangement: 'horizontal',
      suggestedGroups,
      constraints: [
        { type: 'align', targetIds: clusters[0]!.shapeIds, params: { axis: 'y' } },
      ],
      confidence: 0.5,
      source: 'rule',
    }
  }
  return {
    description: '未检测到明确主题分组，保持自由布局',
    suggestedArrangement: 'freeform',
    suggestedGroups: [],
    constraints: [],
    confidence: 0.3,
    source: 'fallback',
  }
}

/**
 * 分析入口（规则层）：质量 + 聚类 + 意图，一次产出。
 * LLM 语义细化（簇命名 / 意图描述）由 llm.ts 后续叠加，不动本层。
 */
export function analyzeRegion(region: SelectionRegion): {
  quality: LayoutQuality
  clusters: SemanticCluster[]
  intent: LayoutIntent
} {
  const quality = assessLayoutQuality(region.shapes)
  const clusters = clusterByKeywords(region.shapes)
  const intent = inferIntentByRules(region.shapes, clusters)
  return { quality, clusters, intent }
}
