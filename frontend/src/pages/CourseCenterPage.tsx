import { useState, type CSSProperties } from 'react'
import { CourseCenterCourseList } from '@/features/course/CourseCenterCourseList'
import { CourseCenterTabs } from '@/features/course/CourseCenterTabs'
import type { CourseCenterTab } from '@/features/course/courseCenterFilters'
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
  // 周进度卡的上边距，也是它到页面内容顶部的距离。
  '--course-center-weekly-card-top': '64px',
  // 周进度卡固定高度：下边缘与左侧第一张课程卡的下边缘齐平。左列到那条边的
  // 累计高度是 标题 34 + 本间距 + Tab 60 + 列表上边距 8 + 卡片 236，减去周卡
  // 自己的上边距就是它该有的高度。写成 calc 是为了在上面几个数字变动时跟着
  // 走——它是固定值，但不该是个来历不明的固定值。
  '--course-center-weekly-card-height':
    'calc(34px + var(--course-center-title-tabs-gap) + 60px + 8px + 236px' +
    ' - var(--course-center-weekly-card-top))',
} as CSSProperties

export function CourseCenterPage() {
  // 工具栏与列表共用筛选状态，故提升到页面。
  const [activeTab, setActiveTab] = useState<CourseCenterTab>('all')
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      <main className="min-h-full">
        <div
          style={COURSE_CENTER_LAYOUT_STYLE}
          className="flex w-full flex-col pt-[var(--course-center-top-space)] pr-[var(--course-center-right-space)] pb-[var(--course-center-bottom-space)] pl-[var(--course-center-left-space)]"
        >
          {/* items-start: 右侧周进度卡按自身内容定高，不跟着课程列表一起变长。 */}
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
            <div className="flex min-w-0 flex-1 flex-col">
              <h1 className="text-[28px] leading-[34px] font-medium text-foreground">
                课程中心
              </h1>

              <div className="mt-[var(--course-center-title-tabs-gap)] flex w-full max-w-[644px] flex-1 flex-col">
                <CourseCenterTabs
                  activeTab={activeTab}
                  onActiveTabChange={setActiveTab}
                  searchTerm={searchTerm}
                  onSearchTermChange={setSearchTerm}
                />
                <CourseCenterCourseList
                  activeTab={activeTab}
                  searchTerm={searchTerm}
                  className="mt-2"
                />
              </div>
            </div>

            {/* 高度固定：与左侧列表完全解耦，有几张课程卡都不影响它。 */}
            <CourseWeeklyProgressCard className="w-full max-w-[330px] xl:mt-[var(--course-center-weekly-card-top)] xl:mr-[44px] xl:h-[var(--course-center-weekly-card-height)] xl:w-[330px] xl:shrink-0" />
          </div>
        </div>
      </main>
    </div>
  )
}
