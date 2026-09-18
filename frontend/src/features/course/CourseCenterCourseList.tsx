import { Skeleton } from '@/components/ui/skeleton'
import { CourseCenterCourseCard } from '@/features/course/CourseCenterCourseCard'
import { useCoursesListQuery } from '@/features/course/courseApi'
import {
  EMPTY_TAB_NOTICE,
  filterCoursesByTab,
  searchCourses,
  type CourseCenterTab,
} from '@/features/course/courseCenterFilters'
import { cn } from '@/lib/utils'

// 卡片高度由左列决定：pt-3 + 176 封面 + pt-2 + 28 按钮行 + pb-3。
const CARD_HEIGHT_CLASS = 'h-[236px]'

function CourseCenterNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-[20px] border border-dashed border-zinc-300 text-[14px] text-zinc-400',
        CARD_HEIGHT_CLASS
      )}
    >
      {children}
    </div>
  )
}

export function CourseCenterCourseList({
  activeTab,
  searchTerm,
  className,
}: {
  activeTab: CourseCenterTab
  searchTerm: string
  className?: string
}) {
  const coursesQuery = useCoursesListQuery()

  if (coursesQuery.isPending) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <Skeleton className={cn('rounded-[20px]', CARD_HEIGHT_CLASS)} />
        <Skeleton className={cn('rounded-[20px]', CARD_HEIGHT_CLASS)} />
      </div>
    )
  }

  if (coursesQuery.isError) {
    return (
      <div className={className}>
        <CourseCenterNotice>课程加载失败</CourseCenterNotice>
      </div>
    )
  }

  const allCourses = coursesQuery.data ?? []
  const courses = searchCourses(
    filterCoursesByTab(allCourses, activeTab),
    searchTerm
  )
  if (courses.length === 0) {
    const notice =
      searchTerm.trim() !== ''
        ? '没有匹配的课程'
        : EMPTY_TAB_NOTICE[activeTab]
    return (
      <div className={className}>
        <CourseCenterNotice>{notice}</CourseCenterNotice>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {courses.map((course) => (
        <CourseCenterCourseCard key={course.id} course={course} />
      ))}
    </div>
  )
}
