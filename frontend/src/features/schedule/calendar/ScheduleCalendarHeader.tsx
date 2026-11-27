import { type ReactNode } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { type ScheduleCourse } from '../getScheduleTasks'
import { CalendarCoursePills } from './CalendarCoursePills'
import { CalendarIconButton, CalendarTextButton } from './ScheduleCalendarParts'
import { type CourseHighlight } from './scheduleCalendarShared'

// 月历的顶栏，从左到右：
// - 年月：月份是标题，年份退后一档；
// - `children`（例如筛选胶囊）靠右，挨着翻月；
//   早先的方案在标题后面放一排课程胶囊（`courses` 加 `highlight`）；
// - 翻月和回到今天。
// 没有月份轨道这类额外的切换条。
export function ScheduleCalendarHeader({
  children,
  courses,
  highlight,
  month,
  onMonthStep,
  onToday,
}: {
  children?: ReactNode
  courses?: ScheduleCourse[]
  highlight?: CourseHighlight
  month: Date
  // 往前（-1）或往后（1）翻一个月。
  onMonthStep: (delta: number) => void
  onToday: () => void
}) {
  return (
    <div className="flex h-[60px] shrink-0 items-center gap-4 pr-3 pl-5">
      <h2 className="shrink-0 text-[20px] leading-none tracking-tight whitespace-nowrap">
        <span className="font-semibold">{format(month, 'MMMM')}</span>{' '}
        <span className="text-zinc-400 tabular-nums">{format(month, 'yyyy')}</span>
      </h2>

      {courses && highlight ? (
        <CalendarCoursePills courses={courses} highlight={highlight} className="flex-1" />
      ) : (
        <div className="flex min-w-0 flex-1 items-center justify-end">{children}</div>
      )}

      <div className="flex shrink-0 items-center gap-0.5">
        <CalendarIconButton
          aria-label="Previous month"
          onClick={() => onMonthStep(-1)}
        >
          <ChevronLeft />
        </CalendarIconButton>
        <CalendarTextButton onClick={onToday}>Today</CalendarTextButton>
        <CalendarIconButton
          aria-label="Next month"
          onClick={() => onMonthStep(1)}
        >
          <ChevronRight />
        </CalendarIconButton>
      </div>
    </div>
  )
}
