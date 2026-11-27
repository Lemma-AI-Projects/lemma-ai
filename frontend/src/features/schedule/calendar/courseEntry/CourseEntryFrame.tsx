import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { ScheduleCalendarHeader } from '../ScheduleCalendarHeader'
import { type CourseHighlight, type CourseSummary } from '../scheduleCalendarShared'
import { type CalendarCourseEntry } from './calendarCourseEntry'
import { CourseEntryLegend } from './CourseEntryLegend'
import { CourseEntryMenu } from './CourseEntryMenu'
import { CourseEntrySidebar } from './CourseEntrySidebar'

// 第四轮的外框：年月、翻月和课程放在哪，由 `courseEntry` 决定；`children` 是星期那一行加格子。
//
// - sidebar：左边一栏放年月、翻月和课程，右边整块都是格子，没有顶栏；
// - menu：顶栏里年月后面跟一个选课程的下拉；
// - task-hover：顶栏只有年月和翻月，课程从格子里的任务进；
// - legend：顶栏只有年月和翻月，课程在格子下方的一行图例里。
export function CourseEntryFrame({
  children,
  courseEntry,
  courses,
  highlight,
  month,
  onMonthStep,
  onToday,
}: {
  children: ReactNode
  courseEntry: CalendarCourseEntry
  courses: CourseSummary[]
  highlight: CourseHighlight
  month: Date
  // 往前（-1）或往后（1）翻一个月。
  onMonthStep: (delta: number) => void
  onToday: () => void
}) {
  if (courseEntry === 'sidebar') {
    return (
      <div className="flex min-h-0 flex-1 gap-3 p-1.5">
        <CourseEntrySidebar
          month={month}
          courses={courses}
          highlight={highlight}
          onMonthStep={onMonthStep}
          onToday={onToday}
        />
        <div className="flex min-w-0 flex-1 flex-col pr-1.5 pb-1.5">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScheduleCalendarHeader month={month} onMonthStep={onMonthStep} onToday={onToday}>
        {courseEntry === 'menu' && (
          // 下拉跟在年月后面，不靠右。
          <div className="mr-auto flex min-w-0">
            <CourseEntryMenu courses={courses} highlight={highlight} />
          </div>
        )}
      </ScheduleCalendarHeader>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col px-3',
          courseEntry !== 'legend' && 'pb-3'
        )}
      >
        {children}
      </div>
      {courseEntry === 'legend' && (
        <CourseEntryLegend
          courses={courses}
          highlight={highlight}
          className="h-10 shrink-0 px-3"
        />
      )}
    </div>
  )
}
