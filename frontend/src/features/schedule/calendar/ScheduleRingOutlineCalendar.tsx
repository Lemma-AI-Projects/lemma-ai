import { useMemo } from 'react'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'

import { cn } from '@/lib/utils'
import { dayKey } from '../getScheduleTasks'
import { DayRing } from './DayRing'
import { ScheduleCalendarHeader } from './ScheduleCalendarHeader'
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
  useFollowSelectedDate,
  type ScheduleCalendarProps,
} from './scheduleCalendarShared'

// 画圆环用的坐标尺寸；实际多大跟着格子走。
const RING_VIEW_SIZE = 60
const RING_STROKE_WIDTH = 3.25

// 日历方案「环 2」：每一天都是一个环。
//
// - 这个月没有任务的日子是一圈细线，有任务的日子是一圈分段的进度环（一个任务一段）。
//   不选中也看得出一天一格，而且整张日历里只有「圆」这一种形状，没有格子线、没有底色。
//   圆的大小跟着日历的高度走，不会小小一个漂在格子中间。邻月的日子没有圈，只有淡淡的数字。
// - 顶栏只有年月、课程、翻月，没有月份轨道。
//   鼠标移到一门课上（或点一下固定住），进度环只画这门课的任务，没有这门课的日子变回一圈细线。
// - 状态都只在圆里垫一层浅灰：悬停浅一档，选中深一档；今天的数字是深色圆底。
export function ScheduleRingOutlineCalendar({
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarProps) {
  const [month, setMonthStart] = useFollowSelectedDate(selectedDate, startOfMonth)
  const weeks = useMemo(() => getMonthWeeksToEnd(month), [month])
  const courses = useMemo(() => listCourses(tasksByDay), [tasksByDay])
  const highlight = useCourseHighlight()

  return (
    <CalendarDayPeekProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <ScheduleCalendarHeader
          month={month}
          courses={courses}
          highlight={highlight}
          onMonthStep={(delta) =>
            setMonthStart((current) => addMonths(current, delta))
          }
          onToday={() => {
            onSelectDate(today)
            setMonthStart(startOfMonth(today))
          }}
        />

        <div
          role="table"
          aria-label={format(month, 'MMMM yyyy')}
          className="flex min-h-0 flex-1 flex-col px-3 pb-3"
        >
          <CalendarWeekdayRow days={weeks[0]} className="h-8" />
          <div
            role="rowgroup"
            className="@container-[size] grid min-h-0 flex-1"
            style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
          >
            {weeks.map((week) => (
              <div key={dayKey(week[0])} role="row" className="grid grid-cols-7">
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
                          className="group flex min-w-0 flex-1 items-center justify-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                        >
                          {/* 整个格子都能点，底色只垫在圆里。 */}
                          <span
                            className={cn(
                              'relative flex aspect-square items-center justify-center rounded-full transition-colors',
                              selected ? 'bg-black/[0.06]' : 'group-hover:bg-black/[0.035]',
                              // 这个月里没有任务的日子：一圈细线。有任务的日子，这一圈就是进度环。
                              inMonth && tasks.length === 0 && 'ring-1 ring-zinc-200 ring-inset'
                            )}
                            // 圆占这一行高度的七成，最小 48px、最大 68px。
                            style={{
                              height: `clamp(48px, ${70 / weeks.length}cqh, 68px)`,
                            }}
                          >
                            <DayRing
                              tasks={tasks}
                              size={RING_VIEW_SIZE}
                              strokeWidth={RING_STROKE_WIDTH}
                              trackColor="#d4d4d8"
                              className={cn(
                                'absolute inset-0 size-full',
                                !inMonth && 'opacity-40'
                              )}
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
                                    : 'font-normal text-zinc-400',
                                !inMonth && 'opacity-40'
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
    </CalendarDayPeekProvider>
  )
}
