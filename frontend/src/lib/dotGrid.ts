import type { CSSProperties } from 'react'

const GRID_SPACING = 24

/** 白板式的灰色点阵背景，随视口平移、缩放；白板画布与知识地图共用这一份。 */
export function dotGridBackground(viewport: {
  x: number
  y: number
  scale: number
}): CSSProperties {
  const spacing = GRID_SPACING * viewport.scale
  const dotRadius = Math.min(1.4, Math.max(0.45, viewport.scale * 0.85))
  return {
    backgroundImage: `radial-gradient(circle, rgb(161 161 170 / 0.45) ${dotRadius}px, transparent ${dotRadius + 0.4}px)`,
    backgroundSize: `${spacing}px ${spacing}px`,
    backgroundPosition: `${viewport.x - spacing / 2}px ${viewport.y - spacing / 2}px`,
  }
}
