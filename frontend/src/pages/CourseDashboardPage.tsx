import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { CourseDashboard } from '@/features/course/dashboard/CourseDashboard'
import { mapCourseDetailToDashboard } from '@/features/course/dashboard/mapCourseDetailToDashboard'
import { CourseStatusNotice } from '@/features/course/CourseStatusNotice'
import { getCourseNoticeMessage } from '@/features/course/getCourseNoticeMessage'
import { useCourseDetailQuery } from '@/hooks/useCourseDetail'
import { isNotFoundError } from '@/lib/apiUtils'

export function CourseDashboardPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const courseQuery = useCourseDetailQuery(courseId)
  const notice = getCourseNoticeMessage({
    isPending: courseQuery.isPending,
    isNotFound: courseQuery.isError && isNotFoundError(courseQuery.error),
    isError: courseQuery.isError,
    status: courseQuery.data?.status,
  })
  const dashboard = useMemo(
    () =>
      courseQuery.data ? mapCourseDetailToDashboard(courseQuery.data) : undefined,
    [courseQuery.data]
  )

  if (notice !== null) {
    return <CourseStatusNotice message={notice} />
  }
  if (!dashboard) {
    return <CourseStatusNotice message="课程不存在或已删除" />
  }
  if (dashboard.modules.length === 0) {
    return <CourseStatusNotice message="这门课程还没有内容" />
  }

  return <CourseDashboard course={dashboard} />
}
