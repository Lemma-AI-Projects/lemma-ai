import { useMemo } from 'react'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'

import { cn } from '@/lib/utils'
import { dayKey } from '../../getScheduleTasks'
import { CalendarMonthRail } from '../CalendarMonthRail'
import { calendarTileClassName, calendarTileTrackColor } from '../calendarTileStyles'
import { DayRing } from '../DayRing'
import {
  CalendarDayNumber,
  CalendarDayPeek,
  CalendarDayPeekProvider,
  CalendarWeekdayRow,
} from '../ScheduleCalendarParts'
import {
  describeDay,
  getMonthWeeksToEnd,
  pickCourseTasks,
  summarizeCourses,
  summarizeMonths,
  useCourseHighlight,
  useFollowSelectedDate,
  type ScheduleCalendarProps,
} from '../scheduleCalendarShared'
import { type CalendarCourseEntry } from './calendarCourseEntry'
import { CourseEntryFrame } from './CourseEntryFrame'
import { CourseEntryLegend } from './CourseEntryLegend'
import { CourseEntryMenu } from './CourseEntryMenu'

// 画圆环用的坐标尺寸；实际多大跟着格子走。
const RING_VIEW_SIZE = 48
const RING_STROKE_WIDTH = 3

// 日历方案「日环月历 4」：格子里不写任务名，每天一圈分段的进度环，鼠标停一下浮出这天的任务。
//
// - 每一天是一块浅灰的圆角片，片与片之间留一道缝；悬停和选中都只是底色深一档。
// - 今天是数字下面一个小圆点。
// - 课程放在哪由 `courseEntry` 决定。突出一门课时，圆环只画这门课的任务，
//   没有这门课的日子圆环消失、数字变浅。
//   · sidebar：左边一栏是年月、翻月和课程，取代原来的十二个月；
//   · 其它：左边一栏还是十二个月（每个月后面的小圆环也只算突出的那门课），
//     课程是格子上方的一个下拉（menu），或者格子下方的一行图例（legend）。
export function CourseEntryRingMonthCalendar({
  courseEntry = 'sidebar',
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarProps & { courseEntry?: CalendarCourseEntry }) {
  const [month, setMonthStart] = useFollowSelectedDate(selectedDate, startOfMonth)
  const weeks = useMemo(() => getMonthWeeksToEnd(month), [month])
  const courses = useMemo(() => summarizeCourses(tasksByDay, month), [tasksByDay, month])
  const highlight = useCourseHighlight()
  const summaries = useMemo(
    () => summarizeMonths(tasksByDay, highlight.active),
    [tasksByDay, highlight.active]
  )

  const backToToday = () => {
    onSelectDate(today)
    setMonthStart(startOfMonth(today))
  }

  const grid = (
    <div
      role="table"
      aria-label={format(month, 'MMMM yyyy')}
      className="flex min-h-0 flex-1 flex-col"
    >
      <CalendarWeekdayRow days={weeks[0]} className="h-8 gap-1" />
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
  )

  if (courseEntry === 'sidebar') {
    return (
      <CalendarDayPeekProvider>
        <CourseEntryFrame
          courseEntry="sidebar"
          month={month}
          courses={courses}
          highlight={highlight}
          onMonthStep={(delta) => setMonthStart((current) => addMonths(current, delta))}
          onToday={backToToday}
        >
          {grid}
        </CourseEntryFrame>
      </CalendarDayPeekProvider>
    )
  }

  return (
    <CalendarDayPeekProvider>
      <div className="flex min-h-0 flex-1 gap-3 p-1.5">
        <CalendarMonthRail
          month={month}
          today={today}
          summaries={summaries}
          onMonthChange={(next) => setMonthStart(startOfMonth(next))}
          onBackToToday={backToToday}
        />

        <div className="flex min-w-0 flex-1 flex-col pr-1.5 pb-1">
          {/* 和左边的年份在同一行。 */}
          {courseEntry === 'menu' && (
            <div className="flex h-8 shrink-0 items-center">
              <CourseEntryMenu courses={courses} highlight={highlight} />
            </div>
          )}
          {grid}
          {/* 和左下角的「回到今天」在同一行。 */}
          {courseEntry === 'legend' && (
            <CourseEntryLegend
              courses={courses}
              highlight={highlight}
              className="mt-2 h-7 shrink-0"
            />
          )}
        </div>
      </div>
    </CalendarDayPeekProvider>
  )
}
