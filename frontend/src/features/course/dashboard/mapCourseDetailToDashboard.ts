import {
  lessonProgressPercent,
  moduleProgressPercent,
} from '@/features/course/courseProgress'
import type { CourseDetail } from '@/types/course'

import type { CourseDashboardData } from './types'

const CHINESE_DIGITS = [
  '零',
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
]

/** 1 -> 「一」，11 -> 「十一」，20 -> 「二十」。课程不会有上百章，够用即可。 */
function toChineseOrdinal(value: number): string {
  if (value < 10) return CHINESE_DIGITS[value] ?? String(value)
  if (value > 99) return String(value)
  const tens = Math.floor(value / 10)
  const ones = value % 10
  const tensLabel = tens === 1 ? '十' : `${CHINESE_DIGITS[tens]}十`
  return ones === 0 ? tensLabel : `${tensLabel}${CHINESE_DIGITS[ones]}`
}

/**
 * 后端快照 -> 仪表盘视图模型。
 *
 * 编号（「1」「一」）在这里按顺序派生——后端不下发它们。进度一律由学习点的
 * completed 聚合而来，绝不能用 buildStatus：那是生成管线状态，一门刚交付的
 * 课程全是 ready 而用户一节未学，拿它渲染会让所有进度环直接满格。
 */
export function mapCourseDetailToDashboard(
  course: CourseDetail
): CourseDashboardData {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    coverUrl: course.coverUrl,
    modules: course.modules.map((module, moduleIndex) => ({
      id: module.id,
      label: String(moduleIndex + 1),
      ordinalLabel: toChineseOrdinal(moduleIndex + 1),
      title: module.title,
      summary: module.summary,
      progress: moduleProgressPercent(module),
      lessons: module.lessons.map((lesson, lessonIndex) => ({
        id: lesson.id,
        label: String(lessonIndex + 1),
        title: lesson.title,
        summary: lesson.summary,
        progress: lessonProgressPercent(lesson),
        points: lesson.points.map((point) => ({
          id: point.id,
          title: point.title,
          completed: point.completed,
        })),
      })),
    })),
  }
}
