import type { CSSProperties } from 'react'
import { CourseCenterTabs } from '@/features/course/CourseCenterTabs'
import { CourseWeeklyProgressCard } from '@/features/course/CourseWeeklyProgressCard'

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

export function CourseCenterPage() {
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
                <CourseCenterTabs />
              </div>
            </div>

            <CourseWeeklyProgressCard className="w-full max-w-[330px] xl:mr-[44px] xl:mt-[64px] xl:w-[330px] xl:shrink-0" />
          </div>
        </div>
      </main>
    </div>
  )
}
