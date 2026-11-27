import { useMemo } from 'react'
import { format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'

import { cn } from '@/lib/utils'
import { dayKey } from '../getScheduleTasks'
import { CalendarCoursePills } from './CalendarCoursePills'
import { CalendarMonthRail } from './CalendarMonthRail'
import { DayRing } from './DayRing'
import {
  CalendarDayNumber,
  CalendarDayPeek,
  CalendarDayPeekProvider,
  CalendarWeekdayRow,
} from './ScheduleCalendarParts'
import {
  describeDay,
  getMonthWeeksToEnd,
  listCourses,
  pickCourseTasks,
  useCourseHighlight,
  summarizeMonths,
  useFollowSelectedDate,
  type ScheduleCalendarProps,
} from './scheduleCalendarShared'

// 画圆环用的坐标尺寸；实际多大跟着格子走。
const RING_VIEW_SIZE = 48
const RING_STROKE_WIDTH = 3

// 日历方案「日环月历 3」：在「日环月历 2」上补两件事，其余不变
// （左边一栏月份，右边是这个月的格子，格子里一圈分段的圆环）。
//
// - 每一天是一块浅灰的圆角片，片与片之间留一道缝：不用线、不用边框，不选中也看得出一天一格。
//   邻月的日子没有片，只有淡淡的数字，这个月的形状一眼看得出来。
// - 格子上方一排课程。鼠标移到一门课上（或点一下固定住），圆环只画这门课的任务，
//   没有这门课的日子圆环消失、数字变浅：这门课排在哪几天一目了然。左边每个月的小圆环也跟着只算这门课。
// - 状态都只换底色：悬停深一档，选中是一块白片；今天的数字是深色圆底。
export function ScheduleRingTileCalendar({
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarProps) {
  const [month, setMonthStart] = useFollowSelectedDate(selectedDate, startOfMonth)
  const weeks = useMemo(() => getMonthWeeksToEnd(month), [month])
  const courses = useMemo(() => listCourses(tasksByDay), [tasksByDay])
  const highlight = useCourseHighlight()
  const summaries = useMemo(
    () => summarizeMonths(tasksByDay, highlight.active),
    [tasksByDay, highlight.active]
  )

  return (
    <CalendarDayPeekProvider>
      <div className="flex min-h-0 flex-1 gap-3 p-1.5">
        <CalendarMonthRail
          month={month}
          today={today}
          summaries={summaries}
          onMonthChange={(next) => setMonthStart(startOfMonth(next))}
          onBackToToday={() => {
            onSelectDate(today)
            setMonthStart(startOfMonth(today))
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col pr-1.5 pb-1.5">
          {/* 和左边的年份在同一行。 */}
          <CalendarCoursePills
            courses={courses}
            highlight={highlight}
            className="h-8 shrink-0"
          />

          <div
            role="table"
            aria-label={format(month, 'MMMM yyyy')}
            className="flex min-h-0 flex-1 flex-col"
          >
            <CalendarWeekdayRow days={weeks[0]} className="h-9 gap-1" />
            <div
              role="rowgroup"
              className="@container-[size] grid min-h-0 flex-1 gap-1"
              style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
            >
              {weeks.map((week) => (
                <div key={dayKey(week[0])} role="row" className="grid grid-cols-7 gap-1">
                  {week.map((day) => {
                    const tasks = pickCourseTasks(
                      tasksByDay.get(dayKey(day)) ?? [],
                      highlight.active
                    )
                    const selected = isSameDay(day, selectedDate)
                    const isToday = isSameDay(day, today)
                    const inMonth = isSameMonth(day, month)

                    return (
                      <div key={dayKey(day)} role="cell" className="flex min-w-0">
                        <CalendarDayPeek tasks={tasks}>
                          <button
                            type="button"
                            aria-label={describeDay(day, tasks.length)}
                            aria-pressed={selected}
                            onClick={() => onSelectDate(day)}
                            className={cn(
                              'flex min-w-0 flex-1 items-center justify-center rounded-[12px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-inset',
                              selected
                                ? 'bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.05)]'
                                : inMonth
                                  ? 'bg-zinc-200/40 hover:bg-zinc-200/75'
                                  : 'hover:bg-zinc-200/40'
                            )}
                          >
                            <span
                              className={cn(
                                'relative flex aspect-square items-center justify-center',
                                // 邻月的日子整体淡一档。
                                !inMonth && 'opacity-40'
                              )}
                              // 圆环占这一行高度的一半多一点，最小 46px、最大 56px。
                              style={{
                                height: `clamp(46px, ${54 / weeks.length}cqh, 56px)`,
                              }}
                            >
                              <DayRing
                                tasks={tasks}
                                size={RING_VIEW_SIZE}
                                strokeWidth={RING_STROKE_WIDTH}
                                trackColor="#d4d4d8"
                                className="absolute inset-0 size-full"
                              />
                              <CalendarDayNumber
                                day={day}
                                isToday={isToday}
                                className={cn(
                                  'h-7 min-w-7 text-[16px] transition-colors',
                                  isToday
                                    ? 'text-[15px] font-semibold'
                                    : tasks.length > 0
                                      ? 'text-zinc-950'
                                      : 'font-normal text-zinc-400'
                                )}
                              />
                            </span>
                          </button>
                        </CalendarDayPeek>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CalendarDayPeekProvider>
  )
}
