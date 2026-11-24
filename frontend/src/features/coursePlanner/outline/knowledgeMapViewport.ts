import type { KnowledgeMapLayout } from './layoutKnowledgeMap'

// 知识地图画布的视口数学：整图适应、以某点为锚缩放，以及卡片里画布该多高。

export const MIN_SCALE = 0.4
export const MAX_SCALE = 2
const FIT_PADDING = 16
/** 整图适应视口时不低于这个比例，再小字就看不清了——宁可露出一部分让人拖。 */
const MIN_FIT_SCALE = 0.7
/** 卡片里画布的标称宽度：36rem 的卡片减去左右内边距与描边。 */
const CARD_CANVAS_WIDTH = 534

export interface Viewport {
  x: number
  y: number
  scale: number
}

export function fitViewport(
  layout: KnowledgeMapLayout,
  width: number,
  height: number,
  maxScale: number
): Viewport {
  const scale = Math.min(
    maxScale,
    Math.max(
      MIN_FIT_SCALE,
      Math.min(
        (width - FIT_PADDING * 2) / Math.max(layout.width, 1),
        (height - FIT_PADDING * 2) / Math.max(layout.height, 1)
      )
    )
  )
  const contentHeight = layout.height * scale
  return {
    scale,
    x: (width - layout.width * scale) / 2,
    // 纵向放不下时顶对齐：先看到最基础的那几层。
    y:
      contentHeight + FIT_PADDING * 2 <= height
        ? (height - contentHeight) / 2
        : FIT_PADDING,
  }
}

export function zoomAround(
  viewport: Viewport,
  factor: number,
  x: number,
  y: number
): Viewport {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale * factor))
  if (scale === viewport.scale) return viewport
  const ratio = scale / viewport.scale
  return {
    x: x - (x - viewport.x) * ratio,
    y: y - (y - viewport.y) * ratio,
    scale,
  }
}

/**
 * 卡片里画布的高度：按整图适应时的缩放比例算，不超过 maxHeight。
 * 节点一多、地图被横向缩小时，画布跟着变矮，不在底下留一大片空白。
 */
export function fitKnowledgeMapHeight(
  layout: KnowledgeMapLayout,
  maxHeight: number
): number {
  const { scale } = fitViewport(layout, CARD_CANVAS_WIDTH, maxHeight, 1)
  return Math.min(maxHeight, Math.ceil(layout.height * scale + FIT_PADDING * 2))
}
