import { Fragment, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import { CourseOverviewProgressMarker } from './CourseOverviewProgressMarker'
import type { CourseOverviewChapter, CourseOverviewData } from './types'

const courseTabValues = ['章节', '测试'] as const
type CourseTab = (typeof courseTabValues)[number]

// 当前 240px 宽、15px 字号下约四行，末尾保留省略号和展开按钮。
const COLLAPSED_DESCRIPTION_LENGTH = 61
const QUIZ_PROGRESS_COLOR = '#eab308'

interface CourseOverviewSidebarProps {
  course: CourseOverviewData
  activeChapter: CourseOverviewChapter | undefined
  onChapterChange: (chapterId: string) => void
}

export function CourseOverviewSidebar({
  course,
  activeChapter,
  onChapterChange,
}: CourseOverviewSidebarProps) {
  const [activeTab, setActiveTab] = useState<CourseTab>('章节')
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const isChapterTab = activeTab === '章节'
  // 测试目录由当前章节派生，编号为「章.节」。
  const chapterQuizUnits = activeChapter
    ? activeChapter.units.map((unit, index) => ({
        id: unit.id,
        label: `${activeChapter.label}.${index + 1}`,
        title: unit.title,
        progress: unit.quizProgress,
      }))
    : []
  const items = isChapterTab ? course.chapters : chapterQuizUnits

  return (
    <div className="absolute top-20 right-26 w-60">
      <div className="size-60 rounded-2xl bg-zinc-200" />
      <h1 className="mt-5 text-center text-xl font-bold text-zinc-900">
        {course.title}
      </h1>
      <p className="mt-3 text-left text-[15px] leading-[21px] font-normal text-zinc-600">
        {descriptionExpanded
          ? course.description
          : `${course.description.slice(0, COLLAPSED_DESCRIPTION_LENGTH)}…`}
        <button
          type="button"
          aria-label={descriptionExpanded ? '折叠课程介绍' : '展开课程介绍'}
          onClick={() => setDescriptionExpanded((current) => !current)}
          // 跟随正文浮动到行尾，并在 21px 行高内垂直居中。
          className="float-right mt-[1.5px] ml-1 flex h-[18px] w-[26px] items-center justify-center rounded-full border border-zinc-300 text-zinc-500 hover:text-zinc-800"
        >
          {descriptionExpanded ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </button>
      </p>
      <div className="mt-4 flex items-center gap-2">
        {courseTabValues.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm transition-colors',
              activeTab === tab
                ? 'bg-zinc-200 text-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted/50'
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="mt-6 flex flex-col">
        {items.map((item, index) => (
          <Fragment key={item.id}>
            {/* 竖线对齐 32px 圆环的圆心。 */}
            {index > 0 && (
              <div className="ml-4 h-6 w-px -translate-x-1/2 bg-zinc-300" />
            )}
            <div className="flex items-center gap-3">
              <CourseOverviewProgressMarker
                label={item.label}
                progress={item.progress}
                progressColor={isChapterTab ? undefined : QUIZ_PROGRESS_COLOR}
              />
              {/* 测试目录仅展示状态，不参与章节切换。 */}
              <button
                type="button"
                disabled={!isChapterTab}
                onClick={() => onChapterChange(item.id)}
                className={cn(
                  'min-w-0 flex-1 -translate-y-px rounded-full px-3 text-left text-[15px] leading-8 font-normal transition-colors',
                  !isChapterTab
                    ? 'cursor-default text-zinc-800'
                    : activeChapter?.id === item.id
                      ? 'bg-zinc-200/55 text-zinc-900'
                      : 'text-zinc-800 hover:bg-zinc-200/30'
                )}
              >
                {item.title}
              </button>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
