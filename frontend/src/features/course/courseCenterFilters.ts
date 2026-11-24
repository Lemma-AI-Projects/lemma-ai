export type CourseCenterTab = 'all' | 'in-progress' | 'completed'

/** 课程中心列表项的视图模型；数据来源接入时由调用方映射成这个形态。 */
export interface CourseCenterCourse {
  id: string
  title: string
  coverUrl: string | null
  createdAt: string
  /** 卡片「课程类型」一栏的文案。 */
  typeLabel: string
  completedPointCount: number
  totalPointCount: number
  /** 「继续学习」显示的下一个学习点；undefined 为加载中，null 为没有。 */
  resumePointTitle?: string | null
}

/**
 * 学完 = 该课程所有学习点都已完成。没有学习点的课程不算学完（空课程谈不上
 * 完成），于是它落在「进行中」里，不会两个页签都不属于。
 */
export function isCourseCompleted(course: CourseCenterCourse): boolean {
  return (
    course.totalPointCount > 0 &&
    course.completedPointCount >= course.totalPointCount
  )
}

/** 「进行中」= 所有没学完的课程，含一节未学的（拍板）。 */
export function filterCoursesByTab(
  courses: CourseCenterCourse[],
  tab: CourseCenterTab
): CourseCenterCourse[] {
  if (tab === 'all') return courses
  if (tab === 'completed') return courses.filter(isCourseCompleted)
  return courses.filter((course) => !isCourseCompleted(course))
}

/** 标题搜索，大小写不敏感；空串返回原列表。 */
export function searchCourses(
  courses: CourseCenterCourse[],
  searchTerm: string
): CourseCenterCourse[] {
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
