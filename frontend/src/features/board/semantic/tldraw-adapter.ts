/**
 * tldraw 适配器——纯函数（S2.1）
 *
 * 把 tldraw shape 投影为语义分析核心的 SelectionRegion。
 * 设计纪律：本文件不 import tldraw 运行时（只依赖其结构形状），
 * 核心逻辑纯函数可单测；Editor 实现在 applier.ts / BoardCanvas 层注入。
 */

import type { BoardShapeInfo, SelectionRegion } from './types'

/** 适配器接受的 shape 最小结构（tldraw TLShape 的子集） */
export interface AdapterShape {
  id: string
  type: string
  x: number
  y: number
  rotation?: number
  isLocked?: boolean
  props: Record<string, unknown>
}

export interface AdapterBinding {
  fromId: string
  toId: string
}

export interface AdapterInput {
  shapes: AdapterShape[]
  bindings: AdapterBinding[]
}

/** 提取形状的语义文本（按 shape.type 分支，未知类型兜底为空串） */
export function shapeText(shape: AdapterShape): string {
  const props = shape.props ?? {}
  if (shape.type === 'knowledgeCard') {
    return typeof props.text === 'string' ? props.text : ''
  }
  if (shape.type === 'conceptNode') {
    return typeof props.label === 'string' ? props.label : ''
  }
  return ''
}

/** 提取掌握度（未知类型/无掌握度返回 undefined） */
function shapeMastery(shape: AdapterShape): BoardShapeInfo['mastery'] {
  const m = shape.props?.mastery
  return m === 'known' || m === 'learning' || m === 'due' ? m : undefined
}

/**
 * 旋转形状的 AABB 保守包围盒（不变形——用旋转后外接矩形）。
 * rotation 单位弧度；tldraw 默认 0。仅当 |rotation| 显著非零时计算。
 */
export function shapeAABB(shape: AdapterShape): { width: number; height: number } {
  const w = typeof shape.props?.w === 'number' ? shape.props.w : 240
  const h = typeof shape.props?.h === 'number' ? shape.props.h : 120
  const r = shape.rotation ?? 0
  const eps = 1e-6
  if (Math.abs(r) < eps) {
    return { width: w, height: h }
  }
  const cos = Math.abs(Math.cos(r))
  const sin = Math.abs(Math.sin(r))
  return {
    width: w * cos + h * sin,
    height: w * sin + h * cos,
  }
}

/**
 * 投影为 SelectionRegion。
 * - connectedIds：经 bindings 推导（from→to 双向视为相连）
 * - boundingBox：全部 shape 的 AABB 外接矩形
 * - 锁定形状保留在区域中（分析可以包含），但应用器会跳过（见 applier）
 */
export function projectShapesToRegion(input: AdapterInput): SelectionRegion {
  const { shapes, bindings } = input

  const connectedById = new Map<string, Set<string>>()
  for (const b of bindings) {
    if (b.fromId === b.toId) continue
    if (!connectedById.has(b.fromId)) connectedById.set(b.fromId, new Set())
    if (!connectedById.has(b.toId)) connectedById.set(b.toId, new Set())
    connectedById.get(b.fromId)!.add(b.toId)
    connectedById.get(b.toId)!.add(b.fromId)
  }

  const infos: BoardShapeInfo[] = shapes.map((s) => {
    const box = shapeAABB(s)
    return {
      id: s.id,
      type: s.type,
      x: s.x,
      y: s.y,
      width: box.width,
      height: box.height,
      text: shapeText(s),
      mastery: shapeMastery(s),
      connectedIds: [...(connectedById.get(s.id) ?? [])],
    }
  })

  if (infos.length === 0) {
    return {
      shapeIds: [],
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      shapes: [],
      selectionMode: 'rectangle',
    }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of infos) {
    minX = Math.min(minX, s.x)
    minY = Math.min(minY, s.y)
    maxX = Math.max(maxX, s.x + s.width)
    maxY = Math.max(maxY, s.y + s.height)
  }

  return {
    shapeIds: infos.map((s) => s.id),
    boundingBox: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
    shapes: infos,
    selectionMode: 'rectangle',
  }
}
