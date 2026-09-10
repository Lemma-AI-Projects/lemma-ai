import { useMemo, useState, type CSSProperties } from 'react'
import { CourseCenterTabs } from '@/features/course/CourseCenterTabs'
import { filterCourseCenterCourses } from '@/features/course/courseCenterFilter'
import { CourseContinueCard, type ContinueCourse } from '@/features/course/CourseContinueCard'
import { CourseListCard } from '@/features/course/CourseListCard'
import { CourseWeeklyProgressCard } from '@/features/course/CourseWeeklyProgressCard'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  CourseCenterCourse,
  CourseCenterTab,
} from '@/features/course/courseCenterTypes'

const COURSE_CENTER_LAYOUT_STYLE = {
  // 标题与整个 Tab 组共用的左边距；增大向右，减小向左。
  '--course-center-left-space': '90px',
  // 页面内容的右侧留白。
  '--course-center-right-space': '24px',
  // 标题距页面顶部的距离；增大向下，减小向上。
  '--course-center-top-space': '72px',
  // 页面内容的底部留白。
  '--course-center-bottom-space': '32px',
  // 标题与 Tab 容器之间的垂直间距；增大时 Tab 向下移动。
  '--course-center-title-tabs-gap': '20px',
} as CSSProperties

export interface CourseCenterViewProps {
  courses: CourseCenterCourse[]
  isPending?: boolean
  isError?: boolean
  continueCourse?: ContinueCourse | null
}

function CourseCardSkeleton() {
  return (
    <div className="rounded-[14px] border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="hidden size-32 shrink-0 rounded-[10px] sm:block" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-5 w-2/5" />
          <Skeleton className="mt-3 h-3 w-1/3" />
          <Skeleton className="mt-4 h-[3px] w-full" />
        </div>
      </div>
    </div>
  )
}

export function CourseCenterView({
  courses,
  isPending,
  isError,
  continueCourse,
}: CourseCenterViewProps) {
  const [activeTab, setActiveTab] = useState<CourseCenterTab>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const visibleCourses = useMemo(
    () => filterCourseCenterCourses(courses, activeTab, searchTerm),
    [courses, activeTab, searchTerm]
  )

  const hasNoCourseAtAll = courses.length === 0

  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      <main className="min-h-full">
        <div
          style={COURSE_CENTER_LAYOUT_STYLE}
          className="flex w-full flex-col pt-[var(--course-center-top-space)] pr-[var(--course-center-right-space)] pb-[var(--course-center-bottom-space)] pl-[var(--course-center-left-space)]"
        >
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
            <div className="min-w-0 flex-1">
              <h1 className="text-[28px] leading-[34px] font-medium text-foreground">
                课程中心
              </h1>

              <div className="mt-[var(--course-center-title-tabs-gap)]">
                <CourseCenterTabs
                  activeTab={activeTab}
                  onActiveTabChange={setActiveTab}
                  searchTerm={searchTerm}
                  onSearchTermChange={setSearchTerm}
                />
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {isPending ? (
                  <>
                    <CourseCardSkeleton />
                    <CourseCardSkeleton />
                    <CourseCardSkeleton />
                  </>
                ) : isError ? (
                  <div className="rounded-[14px] border border-zinc-200 bg-white px-4 py-8 text-center text-[13px] text-zinc-400">
                    课程加载失败
                  </div>
                ) : visibleCourses.length > 0 ? (
                  visibleCourses.map((course, index) => (
                    <CourseListCard
                      key={course.id}
                      course={course}
                      illustrationPosition={index % 2 === 0 ? 'left' : 'right'}
                    />
                  ))
                ) : (
                  <div className="rounded-[14px] border border-zinc-200 bg-white px-4 py-10 text-center text-[13px] text-zinc-400">
                    {hasNoCourseAtAll
                      ? '还没有课程，先在对话里生成一门课吧'
                      : '没有符合条件的课程'}
                  </div>
                )}
              </div>
            </div>

            <div className="flex w-full max-w-[330px] shrink-0 flex-col gap-4 xl:mr-[44px] xl:mt-[64px] xl:w-[330px]">
              <CourseWeeklyProgressCard />
              <CourseContinueCard
                course={continueCourse}
                isPending={isPending}
                isError={isError}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
