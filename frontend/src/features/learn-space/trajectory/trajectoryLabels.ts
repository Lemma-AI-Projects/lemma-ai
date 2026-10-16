import type { TrajectoryKind } from './trajectoryApi'

/**
 * 九类事件的**说法**——列表版与画布版共用这一份，别在两处各写一遍。
 *
 * ⚠️ 这些词是给用户看的**分类名**，不是判断。判断（"什么变了""这对接下来的意义"）
 * 这一版一句都不写。
 */
export const KIND_LABEL: Record<TrajectoryKind, string> = {
  material: '资料',
  annotation: '边注',
  goal: '目标',
  memory: '记住',
  conversation: '对话',
  evidence: '证据',
  bundle: '圈选',
  decision: '决定',
  notification: '提醒',
}

/**
 * 这一行是**谁写的** —— 画布上用它决定方块还是圆。
 *
 * 方块 = 你放的、你写的（资料 / 边注 / 目标 / 记忆 / 圈选 / 对话）；
 * 圆 = 系统自己的动作（证据 / 决定 / 提醒）。
 *
 * ⚠️ 这是一个**事实**（哪张表、由哪一方写入），不是判断。画布上任何"看起来有含义"
 * 的差别都必须能落回一句能核的话，否则就是在用视觉编故事。
 */
const USER_WRITTEN: TrajectoryKind[] = [
  'material',
  'annotation',
  'goal',
  'memory',
  'bundle',
  'conversation',
]

export function isUserWritten(kind: TrajectoryKind): boolean {
  return USER_WRITTEN.includes(kind)
}
