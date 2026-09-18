import type { CourseLesson, CourseModule } from '@/types/course'

/**
 * 完成数换算成 0–100 的百分比（CircularProgress 的取值域）。
 *
 * 没有学习点时返回 0 而不是 100：一个空的章节谈不上「学完了」。
 */
export function toProgressPercent(completed: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((completed / total) * 100)
}

/** 单元进度：其下学习点的完成比例。 */
export function lessonProgressPercent(lesson: CourseLesson): number {
  const completed = lesson.points.filter((point) => point.completed).length
  return toProgressPercent(completed, lesson.points.length)
}

/** 章进度：按学习点数而非单元数算，长单元因此权重更大。 */
export function moduleProgressPercent(module: CourseModule): number {
  const points = module.lessons.flatMap((lesson) => lesson.points)
  const completed = points.filter((point) => point.completed).length
  return toProgressPercent(completed, points.length)
}
