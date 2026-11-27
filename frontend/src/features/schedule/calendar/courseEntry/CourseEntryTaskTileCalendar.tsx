import { useMemo } from 'react'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'

import { dayKey } from '../../getScheduleTasks'
import { getTaskTileCapacity, getTileSpan } from '../calendarTileStyles'
import { CalendarDayPeekProvider, CalendarWeekdayRow } from '../ScheduleCalendarParts'
import {
  getMonthWeeksToEnd,
  summarizeCourses,
  useCourseHighlight,
  useElementSize,
  useFollowSelectedDate,
  type ScheduleCalendarProps,
} from '../scheduleCalendarShared'
import { type CalendarCourseEntry } from './calendarCourseEntry'
import { CourseEntryFrame } from './CourseEntryFrame'
import { CourseEntryTaskTile } from './CourseEntryTaskTile'

// 日历方案「任务月历 3」：每天要做的事直接写在月历上。
//
// - 没有周与周之间的分割线：每一天是一块浅灰的圆角片，片与片之间留一道缝。
// - 整个月刚好铺满、不滚动：各周一样高，一块片里能写几行由片的高度决定（窗口高就多写几行）。
//   写不下的不写，片的右上角标出还有几件。
// - 课程放在哪由 `courseEntry` 决定。突出一门课时，这门课的任务留着、其它的淡下去。
// - 今天是数字旁边一个小圆点；悬停和选中都只是底色深一档。
export function CourseEntryTaskTileCalendar({
  courseEntry = 'menu',
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarProps & { courseEntry?: CalendarCourseEntry }) {
  const [month, setMonthStart] = useFollowSelectedDate(selectedDate, startOfMonth)
  const weeks = useMemo(() => getMonthWeeksToEnd(month), [month])
  const courses = useMemo(() => summarizeCourses(tasksByDay, month), [tasksByDay, month])
  const highlight = useCourseHighlight()
  const [gridRef, gridSize] = useElementSize<HTMLDivElement>()
  // 还没量到格子区有多高时先不写任务。
  const maxRows = gridSize
    ? getTaskTileCapacity(getTileSpan(gridSize.height, weeks.length))
    : 0

  return (
    <CalendarDayPeekProvider>
      <CourseEntryFrame
        courseEntry={courseEntry}
        month={month}
        courses={courses}
        highlight={highlight}
        onMonthStep={(delta) => setMonthStart((current) => addMonths(current, delta))}
        onToday={() => {
          onSelectDate(today)
          setMonthStart(startOfMonth(today))
        }}
      >
        <div
          role="table"
          aria-label={format(month, 'MMMM yyyy')}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* 星期和片里的日期数字左对齐在同一条竖线上。 */}
          <CalendarWeekdayRow
            days={weeks[0]}
            align="start"
            className="h-8 gap-1 *:pl-2.5"
          />
          <div
            ref={gridRef}
            role="rowgroup"
            className="grid min-h-0 flex-1 gap-1"
            style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
          >
            {weeks.map((week) => (
              <div
                key={dayKey(week[0])}
                role="row"
                className="grid min-h-0 grid-cols-7 gap-1"
              >
                {week.map((day) => (
                  <div key={dayKey(day)} role="cell" className="flex min-h-0 min-w-0">
                    <CourseEntryTaskTile
                      day={day}
                      tasks={tasksByDay.get(dayKey(day)) ?? []}
                      maxRows={maxRows}
                      highlight={highlight}
                      taskHover={courseEntry === 'task-hover'}
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
      </CourseEntryFrame>
    </CalendarDayPeekProvider>
  )
}
