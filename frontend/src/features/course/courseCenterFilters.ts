import type { CourseListItem } from '@/types/course'

export type CourseCenterTab = 'all' | 'in-progress' | 'completed'

/**
 * 学完 = 该课程所有学习点都已完成。没有学习点的课程不算学完（空课程谈不上
 * 完成），于是它落在「进行中」里，不会两个页签都不属于。
 */
export function isCourseCompleted(course: CourseListItem): boolean {
  return (
    course.totalPointCount > 0 &&
    course.completedPointCount >= course.totalPointCount
  )
}

/** 「进行中」= 所有没学完的课程，含一节未学的（拍板）。 */
export function filterCoursesByTab(
  courses: CourseListItem[],
  tab: CourseCenterTab
): CourseListItem[] {
  if (tab === 'all') return courses
  if (tab === 'completed') return courses.filter(isCourseCompleted)
  return courses.filter((course) => !isCourseCompleted(course))
}

/** 标题搜索，大小写不敏感；空串返回原列表。 */
export function searchCourses(
  courses: CourseListItem[],
  searchTerm: string
): CourseListItem[] {
  const keyword = searchTerm.trim().toLowerCase()
  if (keyword === '') return courses
  return courses.filter((course) =>
    course.title.toLowerCase().includes(keyword)
  )
}

export const EMPTY_TAB_NOTICE: Record<CourseCenterTab, string> = {
  all: '还没有课程，去对话里让助手帮你生成一门吧',
  'in-progress': '没有进行中的课程',
  completed: '还没有学完的课程',
}
