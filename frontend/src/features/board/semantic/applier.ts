/**
 * 建议应用器（S2.3）——Editor 薄包装
 *
 * 设计纪律：
 * - 纯逻辑（快照/恢复/partial 构建）与 Editor 解耦，可单测
 * - 应用前记录原坐标快照，[撤销] 一键还原（红线：永不自动改用户画布）
 * - Editor 的 updateShapes 天然跳过锁定形状（tldraw v5 源码 9092 行），
 *   应用器不再重复过滤，但构建 partial 时跳过锁定 shape（避免无谓调用）
 */

import type { LayoutSuggestion } from './types'

/** 一次可撤销的位置快照：{ shapeId: {x, y} } */
export type PositionSnapshot = Record<string, { x: number; y: number }>

export interface ShapePositionProvider {
  getShapePosition(shapeId: string): { x: number; y: number } | null
  updateShapes(
    partials: Array<{ id: string; x: number; y: number } | null | undefined>
  ): void
}

/** 构建应用前的快照（仅收集 move 型 change 的源位置） */
export function buildSnapshot(
  suggestion: LayoutSuggestion,
  provider: Pick<ShapePositionProvider, 'getShapePosition'>
): PositionSnapshot {
  const snapshot: PositionSnapshot = {}
  for (const change of suggestion.changes) {
    if (change.type !== 'move') continue
    const pos = provider.getShapePosition(change.shapeId)
    if (pos) snapshot[change.shapeId] = pos
  }
  return snapshot
}

/** 把 suggestion 的 changes 转为 updateShapes partials（仅 move） */
export function toPartials(
  suggestion: LayoutSuggestion
): Array<{ id: string; x: number; y: number } | null | undefined> {
  return suggestion.changes
    .filter((c) => c.type === 'move')
    .map((c) => {
      const to = c.to as { x: number; y: number }
      if (typeof to?.x !== 'number' || typeof to?.y !== 'number') {
        return null
      }
      return { id: c.shapeId, x: Math.round(to.x), y: Math.round(to.y) }
    })
}

/** 应用一条建议；返回快照（供撤销） */
export function applySuggestion(
  suggestion: LayoutSuggestion,
  provider: ShapePositionProvider
): PositionSnapshot {
  const snapshot = buildSnapshot(suggestion, provider)
  const partials = toPartials(suggestion)
  if (partials.length > 0) {
    provider.updateShapes(partials)
  }
  return snapshot
}

/** 按快照恢复位置（撤销） */
export function undoSnapshot(
  snapshot: PositionSnapshot,
  provider: ShapePositionProvider
): void {
  const partials = Object.entries(snapshot).map(([id, pos]) => ({
    id,
    x: Math.round(pos.x),
    y: Math.round(pos.y),
  }))
  if (partials.length > 0) {
    provider.updateShapes(partials)
  }
}

/** 建议是否"有实际内容可应用"（至少一个 move change） */
export function hasApplicableChanges(suggestion: LayoutSuggestion): boolean {
  return suggestion.changes.some((c) => c.type === 'move')
}
