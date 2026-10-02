/**
 * 目标怎么说人话 —— 全部是纯函数，因为"离考试还有几天"这种东西错一次就没人再信。
 *
 * 三条刻意的规矩：
 *
 * 1. **天数按自然日算，不按 24 小时。** 明天下午 3 点考试，今天下午 4 点看是
 *    "明天"，不是"还有 1 天"—— 人对日期就是这么数的。
 * 2. **没有百分比、没有达成概率。** 这里只把已有的日期与文本翻译成句子；
 *    任何形如"完成 73%"的东西都不该出现在这个文件里（也不该出现在别处）。
 * 3. **purpose 说人话，但不是节标题。** 它是"为了什么"，出现在回述句和详情行里，
 *    不做成一排可选标签让人挑 —— 挑标签就把目标变成了设置项。
 */

import type { GoalCloseReason, GoalPurpose, SpaceGoal } from './types'

export const PURPOSE_LABELS: Record<GoalPurpose, string> = {
  exam_performance: '考出成绩',
  understanding: '真正理解',
  build_something: '做出一个东西',
  other: '其它',
}

/** 关闭目标时给学习者看的三个理由 —— 全是 `user_*`，因为这是他的决定。 */
export const USER_CLOSE_OPTIONS: { reason: GoalCloseReason; label: string }[] = [
  { reason: 'user_achieved', label: '达成了' },
  { reason: 'user_superseded', label: '换一个目标' },
  { reason: 'user_abandoned', label: '先放弃了' },
]

/** 同一时刻的零点。用本地日期，因为"还有几天"是人的日历问题。 */
function startOfDay(at: Date): number {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime()
}

const DAY_MS = 86_400_000

/**
 * 距离截止还有几天（自然日）。`null` = 没有截止日期或者日期读不出来。
 *
 * 0 = 今天，1 = 明天，负数 = 已经过期。
 */
export function daysUntil(deadlineAt: string | null, now: Date = new Date()): number | null {
  if (!deadlineAt) return null
  const deadline = new Date(deadlineAt)
  if (Number.isNaN(deadline.getTime())) return null
  // round 而不是 floor：夏令时会让两个零点相差 23 或 25 小时，两者都不是 24 的整数倍。
  return Math.round((startOfDay(deadline) - startOfDay(now)) / DAY_MS)
}

/** 「还有 61 天」/「今天」/「已过期 3 天」。没有日期就不说 —— 不编一个。 */
export function describeDeadline(
  deadlineAt: string | null,
  now: Date = new Date()
): string | null {
  const days = daysUntil(deadlineAt, now)
  if (days === null) return null
  if (days < 0) return `已过期 ${-days} 天`
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  return `还有 ${days} 天`
}

/** 「2026年12月2日」。用来在详情里说清那个数字到底指哪一天。 */
export function formatDeadline(deadlineAt: string | null): string | null {
  if (!deadlineAt) return null
  const date = new Date(deadlineAt)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/**
 * 顶栏里那一行方位：`考到 117 分 · 还有 61 天`。
 *
 * 只放**目标本身与时间**，不放状态、不放进度 —— 顶栏是让人一眼知道"我在为什么
 * 花时间"，不是第二块仪表盘。没有目标时返回 `null`（顶栏就什么都不加）。
 */
export function goalLine(goal: SpaceGoal | null, now: Date = new Date()): string | null {
  if (!goal) return null
  const text = goal.targetText.trim()
  if (!text) return null
  const deadline = describeDeadline(goal.deadlineAt, now)
  return deadline ? `${text} · ${deadline}` : text
}

/**
 * 回述给学习者看的那句话 —— 确认前唯一要读的东西。
 *
 * 它由**字段拼出来**，而不是让模型写一段：这段文字是要给人改的，改完还得再解析
 * 一次，两边的说法迟早对不上；字段是真正会被存下来的东西，所以回述就用字段说。
 */
export function restateGoal(draft: {
  targetText: string
  deadlineAt?: string | null
  context?: string | null
  purpose?: GoalPurpose | null
}): string {
  const parts: string[] = []
  const text = draft.targetText.trim()
  if (text) parts.push(`目标是「${text}」`)
  const date = formatDeadline(draft.deadlineAt ?? null)
  if (date) parts.push(`${date}之前`)
  const context = (draft.context ?? '').trim()
  if (context) parts.push(`在「${context}」这件事上`)
  if (draft.purpose) parts.push(`为了${PURPOSE_LABELS[draft.purpose]}`)
  if (parts.length === 0) return ''
  return `${parts.join('，')}。`
}

/**
 * 编辑器里的那份草稿 → 回述句。
 *
 * 存在的唯一理由是**字段名不一样**：`<input type="date">` 给的是 `YYYY-MM-DD`，
 * 而 `restateGoal` 要的是能直接显示的日期时间。两边名字像、类型不同，直接传过去
 * 不会报错，只会**静默丢掉日期** —— 这个函数就是为了让那一处映射能被单测钉住
 * （离屏断言抓到过一次：回述句里"…之前"整段不见了）。
 */
export function restateLocalDraft(draft: {
  targetText: string
  /** `YYYY-MM-DD`，空串 = 没有截止日期。 */
  deadline: string
  context: string
  purpose?: GoalPurpose | null
}): string {
  return restateGoal({
    targetText: draft.targetText,
    deadlineAt: draft.deadline || null,
    context: draft.context,
    purpose: draft.purpose,
  })
}
