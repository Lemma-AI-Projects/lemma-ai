import { useParams } from 'react-router-dom'

import { CourseDashboard } from '@/features/course/dashboard/CourseDashboard'
import { CourseStatusNotice } from '@/features/course/CourseStatusNotice'
import { courseDashboardSamples } from '@/mock/courseCenterSample'

// [sandbox] 课程仪表盘的样式预览，数据来自 mock。
export function CourseDashboardPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const dashboard = courseId ? courseDashboardSamples[courseId] : undefined

  if (!dashboard) {
    return <CourseStatusNotice message="课程不存在或已删除" />
  }
  if (dashboard.modules.length === 0) {
    return <CourseStatusNotice message="这门课程还没有内容" />
  }

  return <CourseDashboard course={dashboard} />
}
