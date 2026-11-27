import { useMemo, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { type ScheduleTask } from '../getScheduleTasks'
import { CalendarFilterBar } from './CalendarFilterBar'
import { type CalendarFilters } from './calendarFilters'
import { CalendarMonthSidebar } from './CalendarMonthSidebar'
import { ScheduleCalendarHeader } from './ScheduleCalendarHeader'
import { summarizeMonths, type CourseSummary } from './scheduleCalendarShared'

// 月历外面的一圈长什么样：
// - rail：左边一栏月份（年份、十二个月、翻月和回到今天），右边是筛选胶囊加格子；
// - header：没有侧栏，上面一条顶栏放年月、筛选胶囊、翻月，下面整块都是格子。
export type CalendarLayout = 'rail' | 'header'

// 第五轮的外框。`children` 是星期那一行加格子。
//
// 两种布局里，课程和「做完没有」都是两枚筛选胶囊，不占侧栏：
// - rail：胶囊在格子上方、和左边的年份同一行。侧栏只放月份，比放课程窄，格子不会被挤窄多少。
//   侧栏里每个月后面的小圆环，跟着课程胶囊只算选中的那门课。
// - header：胶囊靠右、挨着翻月。年月的宽度每个月都不一样，胶囊不跟在它后面，翻月时才不会左右跳。
export function CalendarFrame({
  children,
  courses,
  filters,
  layout,
  month,
  onMonthSelect,
  onMonthStep,
  onToday,
  tasksByDay,
  today,
}: {
  children: ReactNode
  courses: CourseSummary[]
  filters: CalendarFilters
  layout: CalendarLayout
  month: Date
  // 直接跳到某个月。
  onMonthSelect: (month: Date) => void
  // 往前（-1）或往后（1）翻一个月。
  onMonthStep: (delta: number) => void
  onToday: () => void
  // 没筛过的全部任务，算每个月的进度用。
  tasksByDay: ReadonlyMap<string, readonly ScheduleTask[]>
  today: Date
}) {
  const monthSummaries = useMemo(
    () => summarizeMonths(tasksByDay, filters.course),
    [tasksByDay, filters.course]
  )

  const rail = layout === 'rail'

  // 两种布局写成同一个结构，格子（`children`）在里面的位置不变：
  // 切换布局时格子不会被重新创建，量过的尺寸、滚到的位置都还在。
  return (
    <div className={cn('flex min-h-0 flex-1', rail ? 'gap-3 p-1.5' : 'flex-col')}>
      {rail ? (
        <CalendarMonthSidebar
          month={month}
          today={today}
          summaries={monthSummaries}
          onMonthSelect={onMonthSelect}
          onMonthStep={onMonthStep}
          onToday={onToday}
        />
      ) : (
        <ScheduleCalendarHeader month={month} onMonthStep={onMonthStep} onToday={onToday}>
          <CalendarFilterBar courses={courses} filters={filters} />
        </ScheduleCalendarHeader>
      )}
      <div
        className={cn(
          'flex flex-1 flex-col',
          rail ? 'min-w-0 pr-1.5 pb-1.5' : 'min-h-0 px-3 pb-3'
        )}
      >
        {/* 侧栏布局里，胶囊在格子上方，和左边的年份在同一行。 */}
        {rail && (
          <div className="flex h-8 shrink-0 items-center">
            <CalendarFilterBar courses={courses} filters={filters} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
