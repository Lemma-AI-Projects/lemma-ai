/**
 * PDF 阅读器里的**纯算术** —— 页码夹紧、按容器宽度适配、缩放步进。
 *
 * 单独拎出来是因为：仓库离屏/单测都跑在 `environment: node`（没有 jsdom，也就没有
 * canvas），"渲染得对不对"只能在浏览器里真跑；而"算得对不对"必须在这里被钉住。
 */

export const PDF_MIN_SCALE = 0.5
export const PDF_MAX_SCALE = 3
export const PDF_ZOOM_STEP = 1.25

/** 把缩放夹进可用区间；不是有限数就退回 1（1 = 100%）。 */
export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1
  return Math.min(Math.max(scale, PDF_MIN_SCALE), PDF_MAX_SCALE)
}

/**
 * 按容器宽度把一页适配进来：`scale = 容器宽 / 页面宽`。
 *
 * 容器宽或页面宽不是正数时退回 1 —— 首帧容器还没量出宽度（0）是常态，这时候硬算
 * 会得到一个 0 缩放，画出来是一片空白。
 */
export function fitScale(containerWidth: number, pageWidth: number): number {
  if (!(containerWidth > 0) || !(pageWidth > 0)) return 1
  return clampScale(containerWidth / pageWidth)
}

/** 放大 / 缩小一档（`direction` 为正 = 放大），结果同样夹紧。 */
export function stepZoom(scale: number, direction: 1 | -1): number {
  const base = clampScale(scale)
  return clampScale(direction > 0 ? base * PDF_ZOOM_STEP : base / PDF_ZOOM_STEP)
}

/** 把页码下标夹进 `[0, count - 1]`；空文档退回 0。 */
export function clampPage(index: number, count: number): number {
  if (!Number.isFinite(index) || count <= 0) return 0
  return Math.min(Math.max(Math.trunc(index), 0), count - 1)
}

/** 「3 / 6」这种页码标签（下标进，1 基出）。 */
export function pageLabel(index: number, count: number): string {
  return `${clampPage(index, count) + 1} / ${Math.max(count, 1)}`
}
