import type {
  CourseCenterCourse,
  CourseCenterTab,
} from '@/features/course/courseCenterTypes'

/** Tab 与搜索的过滤规则：状态必须精确匹配，关键词同时匹配标题与来源。 */
export function filterCourseCenterCourses(
  courses: CourseCenterCourse[],
  tab: CourseCenterTab,
  searchTerm: string
): CourseCenterCourse[] {
  const keyword = searchTerm.trim().toLowerCase()

  return courses.filter((course) => {
    const matchesTab = tab === 'all' || course.status === tab
    const matchesKeyword =
      keyword.length === 0 ||
      course.title.toLowerCase().includes(keyword) ||
      course.source.toLowerCase().includes(keyword)

    return matchesTab && matchesKeyword
  })
}
