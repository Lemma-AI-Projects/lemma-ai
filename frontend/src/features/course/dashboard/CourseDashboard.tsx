import { useState } from 'react'

import { cn } from '@/lib/utils'
import { CourseDashboardLessonCard } from './CourseDashboardLessonCard'
import { CourseDashboardProgressMarker } from './CourseDashboardProgressMarker'
import { CourseDashboardSidebar } from './CourseDashboardSidebar'
import type { CourseDashboardData } from './types'

export function CourseDashboard({ course }: { course: CourseDashboardData }) {
  const [activeModuleId, setActiveModuleId] = useState(course.modules[0]?.id)
  const activeModule =
    course.modules.find((module) => module.id === activeModuleId) ??
    course.modules[0]

  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      {activeModule && (
        // 与右侧封面顶边对齐。
        <div className="absolute top-20 left-26 max-w-[670px]">
          <h2 className="text-2xl leading-8 font-medium text-zinc-900">
            第{activeModule.ordinalLabel}章：{activeModule.title}
          </h2>
          {activeModule.summary ? (
            <p className="mt-3 text-[16px] leading-[26px] font-normal text-zinc-600">
              {activeModule.summary}
            </p>
          ) : null}
          <div className="mt-8 flex flex-col">
            {activeModule.lessons.map((lesson, index) => {
              const hasNextLesson = index < activeModule.lessons.length - 1

              return (
                <div
                  key={lesson.id}
                  className={cn('relative flex gap-5', hasNextLesson && 'pb-10')}
                >
                  {/* 竖线沿卡片左侧，将相邻的单元进度圆环连接起来。 */}
                  {hasNextLesson && (
                    <div className="absolute top-10 bottom-0 left-4 w-px -translate-x-1/2 bg-zinc-300" />
                  )}
                  <CourseDashboardProgressMarker
                    label={lesson.label}
                    progress={lesson.progress}
                  />
                  <CourseDashboardLessonCard
                    courseId={course.id}
                    lesson={lesson}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
      <CourseDashboardSidebar
        course={course}
        activeModule={activeModule}
        onModuleChange={setActiveModuleId}
      />
    </div>
  )
}
