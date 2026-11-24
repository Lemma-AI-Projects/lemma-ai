/**
 * 完成数换算成 0–100 的百分比（CircularProgress 的取值域）。
 *
 * 没有学习点时返回 0 而不是 100：一个空的章节谈不上「学完了」。
 */
export function toProgressPercent(completed: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((completed / total) * 100)
}
