import { useMemo } from 'react'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'

import { dayKey } from '../getScheduleTasks'
import { NO_TASKS, useCalendarFilters, useFilteredTasksByDay } from './calendarFilters'
import { CalendarFrame, type CalendarLayout } from './CalendarFrame'
import { CalendarTaskTile } from './CalendarTaskTile'
import {
  CALENDAR_MONTH_GRID_MAX_HEIGHT,
  getTaskTileCapacity,
  getTileSpan,
} from './calendarTileStyles'
import { CalendarWeekdayRow } from './ScheduleCalendarParts'
import {
  getMonthWeeks,
  summarizeCourses,
  useElementSize,
  useFollowSelectedDate,
  type ScheduleCalendarProps,
} from './scheduleCalendarShared'

// 日历方案「任务月历 4」：每天要做的事直接写在月历上。
//
// - 外框由 `layout` 决定（见 CalendarFrame）：左边一栏月份，或者上面一条顶栏。
//   课程和「做完没有」都是两枚筛选胶囊。
// - 没有周与周之间的分割线：每一天是一块浅灰的圆角片，片与片之间留一道缝。
// - 固定排六周，整个月刚好铺满、不滚动，翻月时片的大小和位置不变。
//   一块片里能写几行由片的高度决定（窗口高就多写几行）；写不下的不写，片的右上角标出还有几件。
// - 筛了课程或者「做完没有」之后，片里只写留下来的任务。
// - 今天是数字旁边一个小圆点；悬停和选中都只是底色深一档。
export function ScheduleTaskTileCalendar({
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
  const [gridRef, gridSize] = useElementSize<HTMLDivElement>()
  // 还没量到格子区有多高时先不写任务。
  const maxRows = gridSize
    ? getTaskTileCapacity(getTileSpan(gridSize.height, weeks.length))
    : 0

  return (
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
        {/* 星期和片里的日期数字左对齐在同一条竖线上。 */}
        <CalendarWeekdayRow days={weeks[0]} align="start" className="h-8 gap-1 *:pl-2.5" />
        <div
          ref={gridRef}
          role="rowgroup"
          className="grid min-h-0 flex-1 gap-1"
          style={{
            gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))`,
            maxHeight: CALENDAR_MONTH_GRID_MAX_HEIGHT,
          }}
        >
          {weeks.map((week) => (
            <div
              key={dayKey(week[0])}
              role="row"
              className="grid min-h-0 grid-cols-7 gap-1"
            >
              {week.map((day) => (
                <div key={dayKey(day)} role="cell" className="flex min-h-0 min-w-0">
                  <CalendarTaskTile
                    day={day}
                    tasks={shownTasksByDay.get(dayKey(day)) ?? NO_TASKS}
                    maxRows={maxRows}
                    inMonth={isSameMonth(day, month)}
                    isToday={isSameDay(day, today)}
                    selected={isSameDay(day, selectedDate)}
                    onSelect={() => onSelectDate(day)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </CalendarFrame>
  )
}
