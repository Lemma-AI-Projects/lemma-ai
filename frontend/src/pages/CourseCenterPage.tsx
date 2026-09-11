import { useMemo } from 'react'
import { format } from 'date-fns'
import { GraduationCap } from 'lucide-react'
import { CourseCenterView } from '@/features/course/CourseCenterView'
import {
  useCoursesListQuery,
  type CourseListItem,
} from '@/features/course/courseLearningApi'
import type {
  CourseCenterCourse,
  CourseCenterStatus,
} from '@/features/course/courseCenterTypes'
import { useAppTranslation } from '@/i18n'
import type { TranslationKey } from '@/i18n/keys'

// 中性插图底色，与 mock 数据保持一致；不引入品牌色。
const ILLUSTRATION_TONES = ['bg-zinc-100', 'bg-stone-100', 'bg-slate-100']

function toCourseCenterStatus(status: string): CourseCenterStatus {
  switch (status) {
    case 'researching':
    case 'building':
      return 'in-progress'
    case 'ready':
      return 'completed'
    default:
      // intake / failed 等在中心页都当作未开始；失败态由课程详情页表达。
      return 'not-started'
  }
}

function formatAddedAt(updatedAt: string): string {
  const date = new Date(updatedAt)
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'yyyy/MM/dd')
}

// 后端目前只下发 id/title/status/updatedAt：进度与「下一讲」尚无真实来源，
// 因此这里不伪造，卡片按缺省渲染（进度 0%、省略 UP NEXT 区块）。
function mapCourseListItem(
  course: CourseListItem,
  index: number,
  t: (key: TranslationKey) => string
): CourseCenterCourse {
  return {
    id: course.id,
    title: course.title,
    source: t('course.sourceAi'),
    addedAt: formatAddedAt(course.updatedAt),
    progress: 0,
    status: toCourseCenterStatus(course.status),
    icon: GraduationCap,
    tone: ILLUSTRATION_TONES[index % ILLUSTRATION_TONES.length],
  }
}

export function CourseCenterPage() {
  const { t } = useAppTranslation()
  const coursesQuery = useCoursesListQuery()
  const courses = useMemo(
    () => (coursesQuery.data ?? []).map((course, index) =>
      mapCourseListItem(course, index, t)
    ),
    [coursesQuery.data, t]
  )
  const continueCourse = courses.find((course) => course.status === 'in-progress')

  return (
    <CourseCenterView
      courses={courses}
      isPending={coursesQuery.isPending}
      isError={coursesQuery.isError}
      continueCourse={continueCourse}
    />
  )
}
