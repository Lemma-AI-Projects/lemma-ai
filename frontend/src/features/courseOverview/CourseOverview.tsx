import { useState } from 'react'

import { cn } from '@/lib/utils'
import { CourseOverviewProgressMarker } from './CourseOverviewProgressMarker'
import { CourseOverviewSidebar } from './CourseOverviewSidebar'
import { CourseOverviewUnitCard } from './CourseOverviewUnitCard'
import type { CourseOverviewData } from './types'

export function CourseOverview({ course }: { course: CourseOverviewData }) {
  const [activeChapterId, setActiveChapterId] = useState(course.chapters[0]?.id)
  const activeChapter =
    course.chapters.find((chapter) => chapter.id === activeChapterId) ??
    course.chapters[0]

  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      {activeChapter && (
        // 与右侧封面占位顶边对齐。
        <div className="absolute top-20 left-26 max-w-[670px]">
          <h2 className="text-2xl leading-8 font-medium text-zinc-900">
            第{activeChapter.ordinalLabel}章：{activeChapter.title}
          </h2>
          <p className="mt-3 text-[16px] leading-[26px] font-normal text-zinc-600">
            {activeChapter.summary}
          </p>
          <div className="mt-8 flex flex-col">
            {activeChapter.units.map((unit, index) => {
              const hasNextUnit = index < activeChapter.units.length - 1

              return (
                <div
                  key={unit.id}
                  className={cn('relative flex gap-5', hasNextUnit && 'pb-10')}
                >
                  {/* 竖线沿卡片左侧，将相邻的单元进度圆环连接起来。 */}
                  {hasNextUnit && (
                    <div className="absolute top-10 bottom-0 left-4 w-px -translate-x-1/2 bg-zinc-300" />
                  )}
                  <CourseOverviewProgressMarker
                    label={unit.label}
                    progress={unit.progress}
                  />
                  {unit.card && <CourseOverviewUnitCard card={unit.card} />}
                </div>
              )
            })}
          </div>
        </div>
      )}
      <CourseOverviewSidebar
        course={course}
        activeChapter={activeChapter}
        onChapterChange={setActiveChapterId}
      />
    </div>
  )
}
