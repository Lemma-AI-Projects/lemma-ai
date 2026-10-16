import { isUserWritten } from './trajectoryLabels'
import type { TrajectoryKind } from './trajectoryApi'

/**
 * 两个小标记，列表版与画布版共用 —— 免得"时间≈"或"什么形状"在两处各写一遍、
 * 然后有一天只改了一处。
 */

/**
 * 「时间≈」—— 近似时间的标记。
 *
 * ⚠️ 它存在的唯一理由是**不能把近似当精确**：边注所在的那张表没有时间戳，
 * 用的是它所在**页**的更新时间。所以这个标记必须比标题显眼一点点，否则没人会看见。
 */
export function ApproxMark() {
  return (
    <span
      title="这张表里没有时间戳，这里用的是它所在页的更新时间"
      className="shrink-0 rounded border border-dashed border-zinc-300 px-1 text-[10px] text-zinc-400 dark:border-zinc-600"
    >
      时间≈
    </span>
  )
}

/**
 * 画布上的形状标记。两件事，都能落回一句能核的话：
 *
 * - **方块 = 你放的/你写的**（资料 / 边注 / 目标 / 记忆 / 圈选 / 对话）；
 *   **圆 = 系统自己的动作**（证据 / 决定 / 提醒）。这是"哪张表、谁写入的"这个事实。
 * - **实心只有一种：证据。** 它是九类里唯一意味着"系统知道你会了"的东西，
 *   而它今天几乎不出现 —— 于是缩到最小时，图上那一颗实心点就是最该被看见的东西。
 *
 * ⚠️ 这两个差别都**不是判断**。任何"看起来有含义"的视觉差别都要能落回一句能核的话，
 * 否则就是在用视觉编故事。
 */
export function KindMark({ kind }: { kind: TrajectoryKind }) {
  const user = isUserWritten(kind)
  const filled = kind === 'evidence'
  return (
    <span
      aria-hidden
      className={`block size-2.5 shrink-0 border border-zinc-900 ${
        filled ? 'bg-zinc-900' : 'bg-white'
      } ${user ? 'rounded-[1px]' : 'rounded-full'}`}
    />
  )
}
