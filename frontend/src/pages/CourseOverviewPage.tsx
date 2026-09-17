import { CourseOverview } from '@/features/courseOverview/CourseOverview'
import { courseOverviewMock } from '@/mock/courseOverview'

export function CourseOverviewPage() {
  return <CourseOverview course={courseOverviewMock} />
}
