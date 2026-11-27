import { useMemo } from 'react'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'

import { cn } from '@/lib/utils'
import { dayKey } from '../getScheduleTasks'
import { NO_TASKS, useCalendarFilters, useFilteredTasksByDay } from './calendarFilters'
import { CalendarFrame, type CalendarLayout } from './CalendarFrame'
import {
  CALENDAR_MONTH_GRID_MAX_HEIGHT,
  calendarTileClassName,
  calendarTileTrackColor,
} from './calendarTileStyles'
import { DayRing } from './DayRing'
import {
  CalendarDayNumber,
  CalendarDayPeek,
  CalendarDayPeekProvider,
  CalendarWeekdayRow,
} from './ScheduleCalendarParts'
import {
  describeDay,
  getMonthWeeks,
  summarizeCourses,
  useFollowSelectedDate,
  type ScheduleCalendarProps,
} from './scheduleCalendarShared'

// 画圆环用的坐标尺寸；实际多大跟着格子走。
const RING_VIEW_SIZE = 48
const RING_STROKE_WIDTH = 3

// 日历方案「日环月历 5」：格子里不写任务名，每天一圈分段的进度环，鼠标停一下浮出这天的任务。
//
// - 外框由 `layout` 决定（见 CalendarFrame）：左边一栏月份，或者上面一条顶栏。
//   课程和「做完没有」都是两枚筛选胶囊。
// - 每一天是一块浅灰的圆角片，片与片之间留一道缝；悬停和选中都只是底色深一档。
//   固定排六周，片差不多到正方形就不再长高：翻月时片的大小和位置不变，也不会被拉成竖长条。
// - 今天是数字下面一个小圆点。
// - 筛了课程或者「做完没有」之后，圆环只画留下来的任务，没有的日子圆环消失、数字变浅。
export function ScheduleRingMonthCalendar({
  layout = 'rail',
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarProps & { layout?: CalendarLayout }) {
  const [month, setMonthStart] = useFollowSelectedDate(selectedDate, startOfMonth)
  const weeks = useMemo(() => getMonthWeeks(month), [month])
  const courses = useMemo(() => summarizeCourses(tasksByDay, month), [tasksByDay, month])
  const filters = useCalendarFilters()
  const shownTasksByDay = useFilteredTasksByDay(tasksByDay, filters)

  return (
    <CalendarDayPeekProvider>
      <CalendarFrame
        layout={layout}
        month={month}
        today={today}
        tasksByDay={tasksByDay}
        courses={courses}
        filters={filters}
        onMonthSelect={(next) => setMonthStart(startOfMonth(next))}
        onMonthStep={(delta) => setMonthStart((current) => addMonths(current, delta))}
        onToday={() => {
          onSelectDate(today)
          setMonthStart(startOfMonth(today))
        }}
      >
        <div
          role="table"
          aria-label={format(month, 'MMMM yyyy')}
          className="@container flex min-h-0 flex-1 flex-col"
        >
          <CalendarWeekdayRow days={weeks[0]} className="h-8 gap-1" />
          <div
            role="rowgroup"
            className="@container-[size] grid min-h-0 flex-1 gap-1"
            style={{
              gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))`,
              maxHeight: CALENDAR_MONTH_GRID_MAX_HEIGHT,
            }}
          >
            {weeks.map((week) => (
              <div key={dayKey(week[0])} role="row" className="grid grid-cols-7 gap-1">
                {week.map((day) => {
                  const tasks = shownTasksByDay.get(dayKey(day)) ?? NO_TASKS
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
                            'flex min-w-0 flex-1 items-center justify-center',
                            calendarTileClassName({ inMonth, selected })
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
                              trackColor={calendarTileTrackColor(selected)}
                              className="absolute inset-0 size-full"
                            />
                            <CalendarDayNumber
                              day={day}
                              isToday={isToday}
                              todayStyle="plain"
                              className={cn(
                                'text-[16px] transition-colors',
                                isToday
                                  ? 'font-semibold text-zinc-950'
                                  : tasks.length > 0
                                    ? 'text-zinc-950'
                                    : 'font-normal text-zinc-400'
                              )}
                            />
                            {/* 今天：数字下面一个小圆点。 */}
                            {isToday && (
                              <span
                                aria-hidden
                                className="absolute bottom-[17%] left-1/2 size-1 -translate-x-1/2 rounded-full bg-zinc-950"
                              />
                            )}
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
      </CalendarFrame>
    </CalendarDayPeekProvider>
  )
}
