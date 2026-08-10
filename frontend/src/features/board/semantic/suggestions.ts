/**
 * 布局建议生成器（S2.2）——确定性规则，零 AI 依赖
 *
 * 由 analyzeRegion 的 clusters/intent + region.shapes 产出可应用的
 * LayoutSuggestion（≤3 条，克制优先）。S3 再接 LLM 语义细化；
 * 本层保持纯函数可单测。
 */

import type {
  BoardShapeInfo,
  LayoutIntent,
  LayoutSuggestion,
  SemanticCluster,
} from './types'

/** 对齐网格尺寸（与 analyzer 的 GRID 一致） */
const GRID = 8
/** 分组排布的组间距 */
const GROUP_GAP = 48
/** 组内间距 */
const ITEM_GAP = 24
/** 最大建议条数 */
const MAX_SUGGESTIONS = 3

function snapToGrid(v: number): number {
  return Math.round(v / GRID) * GRID
}

interface SuggestionContext {
  shapes: BoardShapeInfo[]
  clusters: SemanticCluster[]
  intent: LayoutIntent
}

/**
 * 建议 1：对齐网格（move）——把所有形状吸附到 8px 网格。
 * 仅当有形状未对齐时产出。
 */
function buildAlignSuggestion(ctx: SuggestionContext): LayoutSuggestion | null {
  const changes = ctx.shapes
    .filter((s) => s.x % GRID !== 0 || s.y % GRID !== 0)
    .map((s) => {
      const nx = snapToGrid(s.x)
      const ny = snapToGrid(s.y)
      return {
        shapeId: s.id,
        type: 'move' as const,
        from: { x: s.x, y: s.y },
        to: { x: nx, y: ny },
      }
    })
  if (changes.length === 0) {
    return null
  }
  return {
    id: 'align-grid',
    title: '对齐网格',
    description: `将 ${changes.length} 个形状吸附到 ${GRID}px 网格`,
    changes,
    estimatedImprovement: 0.1,
    automatic: true,
  }
}

/**
 * 建议 2：按主题分组排布（move）——把同一簇的形状排成
 * grid/horizontal（组内 ITEM_GAP，组间 GROUP_GAP），保持组左上角不动。
 */
function buildClusterSuggestion(ctx: SuggestionContext): LayoutSuggestion | null {
  const { shapes, clusters } = ctx
  if (clusters.length === 0) {
    return null
  }
  const byId = new Map(shapes.map((s) => [s.id, s]))
  const changes: LayoutSuggestion['changes'] = []
  let cursorX = 0
  let cursorY = 0
  for (const cluster of clusters) {
    const members = cluster.shapeIds
      .map((id) => byId.get(id))
      .filter((s): s is BoardShapeInfo => Boolean(s))
    if (members.length < 2) continue

    const arranged =
      cluster.suggestedArrangement === 'horizontal'
        ? horizontalArrangement(members, cursorX, cursorY)
        : gridArrangement(members, cursorX, cursorY)

    for (const m of arranged) {
      if (m.shape.x === m.x && m.shape.y === m.y) continue
      changes.push({
        shapeId: m.shape.id,
        type: 'move',
        from: { x: m.shape.x, y: m.shape.y },
        to: { x: m.x, y: m.y },
      })
    }

    // 下一个簇换行，避免无限横向
    const clusterWidth = Math.max(...arranged.map((a) => a.x + a.shape.width)) - cursorX
    const clusterHeight = Math.max(...arranged.map((a) => a.y + a.shape.height)) - cursorY
    if (cursorX + clusterWidth > 1600 && cursorY > 0) {
      cursorX = 0
      cursorY += clusterHeight + GROUP_GAP
    } else {
      cursorX += clusterWidth + GROUP_GAP
    }
  }

  if (changes.length === 0) {
    return null
  }
  return {
    id: 'group-layout',
    title: '按主题分组排布',
    description: `按 ${clusters.length} 个主题组重新排布`,
    changes,
    estimatedImprovement: 0.3,
    automatic: false,
  }
}

function horizontalArrangement(
  members: BoardShapeInfo[],
  baseX: number,
  baseY: number
): Array<{ shape: BoardShapeInfo; x: number; y: number }> {
  return members.map((shape, i) => ({
    shape,
    x: baseX + i * ITEM_GAP,
    y: baseY,
  }))
}

function gridArrangement(
  members: BoardShapeInfo[],
  baseX: number,
  baseY: number
): Array<{ shape: BoardShapeInfo; x: number; y: number }> {
  const cols = Math.max(1, Math.ceil(Math.sqrt(members.length)))
  return members.map((shape, i) => ({
    shape,
    x: baseX + (i % cols) * ITEM_GAP,
    y: baseY + Math.floor(i / cols) * ITEM_GAP,
  }))
}

/**
 * 建议 3：消重叠（move）——把相互重叠的形状沿右下推开（最小位移）。
 */
function buildOverlapSuggestion(ctx: SuggestionContext): LayoutSuggestion | null {
  const { shapes } = ctx
  function rectsOverlap(a: BoardShapeInfo, b: BoardShapeInfo): boolean {
    const ix = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    const iy = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
    const inter = ix * iy
    const area = Math.min(a.width * a.height, b.width * b.height)
    return area > 0 && inter / area > 0.1
  }

  const moved = new Set<string>()
  const changes: LayoutSuggestion['changes'] = []
  const positions = new Map(shapes.map((s) => [s.id, { x: s.x, y: s.y }]))

  // 贪心：每对重叠，把后者沿 x 推开一个宽度 + 间距
  for (let i = 0; i < shapes.length; i += 1) {
    for (let j = i + 1; j < shapes.length; j += 1) {
      const a = shapes[i]!
      const b = shapes[j]!
      const pa = positions.get(a.id)!
      const pb = positions.get(b.id)!
      const aShifted = { ...a, x: pa.x, y: pa.y }
      const bShifted = { ...b, x: pb.x, y: pb.y }
      if (!rectsOverlap(aShifted, bShifted)) continue

      const pushX = pb.x + b.width + ITEM_GAP
      if (!moved.has(b.id)) {
        changes.push({
          shapeId: b.id,
          type: 'move',
          from: { x: pb.x, y: pb.y },
          to: { x: pushX, y: pb.y },
        })
        positions.set(b.id, { x: pushX, y: pb.y })
        moved.add(b.id)
      }
    }
  }

  if (changes.length === 0) {
    return null
  }
  return {
    id: 'resolve-overlap',
    title: '消除重叠',
    description: `将 ${changes.length} 个重叠形状推开`,
    changes,
    estimatedImprovement: 0.2,
    automatic: false,
  }
}

/** 生成建议（≤3 条）：对齐（自动）→ 分组（用户确认）→ 消重叠（用户确认） */
export function generateSuggestions(
  region: SelectionRegionLike,
  analysis: { clusters: SemanticCluster[]; intent: LayoutIntent }
): LayoutSuggestion[] {
  const ctx: SuggestionContext = {
    shapes: region.shapes,
    clusters: analysis.clusters,
    intent: analysis.intent,
  }
  const suggestions: LayoutSuggestion[] = []
  for (const builder of [buildAlignSuggestion, buildClusterSuggestion, buildOverlapSuggestion]) {
    const s = builder(ctx)
    if (s) suggestions.push(s)
    if (suggestions.length >= MAX_SUGGESTIONS) break
  }
  return suggestions
}

/** 区域类型（避免 import SelectionRegion 循环依赖时卡 tldraw 结构） */
export interface SelectionRegionLike {
  shapes: BoardShapeInfo[]
}
