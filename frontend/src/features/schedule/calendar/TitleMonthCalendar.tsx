import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { dayKey } from '@/features/schedule/getScheduleTasks'
import { cn } from '@/lib/utils'
import { CalendarIconButton, CalendarTaskMark } from './CalendarParts'
import { CALENDAR_TODAY_NUMBER_CLASS_NAME } from './calendarStyles'
import {
  CALENDAR_WEEKDAY_LABELS,
  calendarDayLabel,
  calendarTaskProgress,
  calendarTaskStatus,
  getCalendarMonthWeeks,
  type ScheduleCalendarViewProps,
} from './calendarTasks'

// 一行任务名的高度，以及格子里除任务以外占掉的高度（格子的内外边距 + 日期数字那一行）。
const TASK_ROW_HEIGHT = 18
const CELL_CHROME_HEIGHT = 34

// 日历方案（任务月历）：格子里直接写任务名，不用点进去就知道每天要学什么。
//
// 顶栏从左到右：月份标题、这个月出现的课程、翻月。
// 课程胶囊是可以操作的：鼠标移上去，这门课的任务留着、其它的淡出，一眼看出它排在每周哪几天；
// 点一下固定住，再点一下松开。高亮的样子（白底加一圈细黑边）和淡出的做法都和知识地图一致。
//
// 格子没有边框，也没有底色；一周和一周之间只有一条细线。悬停垫一层浅灰，选中再深一档。
export function TitleMonthCalendar({
  courses,
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarViewProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [month, setMonth] = useState(() => startOfMonth(selectedDate))
  const [gridHeight, setGridHeight] = useState(0)
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null)
  const [pinnedCourseId, setPinnedCourseId] = useState<string | null>(null)

  const weeks = useMemo(() => getCalendarMonthWeeks(month), [month])

  // 这个月里有任务的课程，按课程本来的顺序（补在前后的邻月日子不算）。
  const visibleCourses = useMemo(() => {
    const ids = new Set<string>()
    for (const week of weeks) {
      for (const day of week) {
        if (!isSameMonth(day, month)) continue
        for (const task of tasksByDay.get(dayKey(day)) ?? []) {
          ids.add(task.courseId)
        }
      }
    }
    return courses.filter((course) => ids.has(course.id))
  }, [courses, month, tasksByDay, weeks])

  // 固定住的课程翻到别的月不一定还在；不在就当作没有固定。
  const pinnedId = visibleCourses.some((course) => course.id === pinnedCourseId)
    ? pinnedCourseId
    : null
  // 悬停优先于固定。
  const activeCourseId = hoveredCourseId ?? pinnedId

  // 格子能放下几行任务名取决于格子有多高，量出来再定。
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return undefined
    const observer = new ResizeObserver(([entry]) => {
      setGridHeight(entry.contentRect.height)
    })
    observer.observe(grid)
    return () => observer.disconnect()
  }, [])

  const maxRows = Math.max(
    1,
    Math.floor((gridHeight / weeks.length - CELL_CHROME_HEIGHT) / TASK_ROW_HEIGHT)
  )

  const selectDay = (day: Date) => {
    onSelectDate(day)
    setMonth(startOfMonth(day))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 px-4">
        <h2 className="shrink-0 text-[19.5px] leading-7 font-semibold tracking-tight text-zinc-950 tabular-nums">
          {format(month, 'yyyy年M月')}
        </h2>

        <div
          role="group"
          aria-label="按课程高亮"
          // 只有一行高，放不下的课程整枚折到下一行被裁掉，不会露出半枚。
          className="flex h-[22px] min-w-0 flex-1 flex-wrap gap-x-1.5 gap-y-2 overflow-hidden"
        >
          {visibleCourses.map((course) => {
            const active = course.id === activeCourseId

            return (
              <button
                key={course.id}
                type="button"
                aria-pressed={course.id === pinnedId}
                onPointerEnter={() => setHoveredCourseId(course.id)}
                onPointerLeave={() => setHoveredCourseId(null)}
                onClick={() =>
                  setPinnedCourseId(course.id === pinnedId ? null : course.id)
                }
                className={cn(
                  'inline-flex h-[22px] shrink-0 items-center rounded-full px-2 text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-zinc-400',
                  active
                    ? 'bg-white text-zinc-950 ring-1 ring-zinc-900 ring-inset'
                    : 'bg-zinc-100 text-zinc-700'
                )}
              >
                {course.name}
              </button>
            )
          })}
        </div>

        {/* 翻月：和知识地图右下角的缩放控件是同一种胶囊。 */}
        <div
          role="group"
          aria-label="翻月"
          className="flex shrink-0 items-center gap-0.5 rounded-full p-0.5 ring-1 ring-zinc-200 ring-inset"
        >
          <CalendarIconButton
            aria-label="上个月"
            onClick={() => setMonth((current) => addMonths(current, -1))}
          >
            <ChevronLeft />
          </CalendarIconButton>
          <button
            type="button"
            onClick={() => selectDay(today)}
            className="h-6 rounded-full px-2 text-[12.5px] leading-none text-zinc-700 outline-none transition-colors hover:bg-zinc-200/60 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            今天
          </button>
          <CalendarIconButton
            aria-label="下个月"
            onClick={() => setMonth((current) => addMonths(current, 1))}
          >
            <ChevronRight />
          </CalendarIconButton>
        </div>
      </div>

      <div
        role="table"
        aria-label={format(month, 'yyyy年M月')}
        className="flex min-h-0 flex-1 flex-col px-3 pb-2"
      >
        <div role="row" className="grid h-7 shrink-0 grid-cols-7">
          {CALENDAR_WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              role="columnheader"
              // 左边距和下面格子里的日期数字对齐。
              className="flex items-center pl-[10px] text-[12.5px] text-zinc-500"
            >
              {label}
            </div>
          ))}
        </div>

        <div
          ref={gridRef}
          role="rowgroup"
          className="grid min-h-0 flex-1"
          style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
        >
          {weeks.map((week) => (
            <div
              key={dayKey(week[0])}
              role="row"
              className="grid min-h-0 grid-cols-7 border-t border-zinc-200/80"
            >
              {week.map((day) => {
                const isToday = isSameDay(day, today)
                const inMonth = isSameMonth(day, month)
                const selected = isSameDay(day, selectedDate)
                const tasks = tasksByDay.get(dayKey(day)) ?? []
                // 放不下时少显示一行，把那一行让给「+N」。
                const shown = tasks.length > maxRows ? tasks.slice(0, maxRows - 1) : tasks
                const hiddenCount = tasks.length - shown.length

                return (
                  <div key={dayKey(day)} role="cell" className="flex min-h-0 min-w-0 p-0.5">
                    <button
                      type="button"
                      aria-label={calendarDayLabel(day, tasks.length)}
                      aria-pressed={selected}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={() => selectDay(day)}
                      className={cn(
                        'flex min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] px-1 pt-1 pb-1 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-inset',
                        selected ? 'bg-zinc-200/60' : 'hover:bg-zinc-100'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-5 shrink-0 items-center self-start rounded-full text-[13px] leading-none tabular-nums',
                          // 今天的数字圈在一个小圆里；其它日子的数字和下面的任务左对齐。
                          isToday
                            ? cn('min-w-5 justify-center px-1', CALENDAR_TODAY_NUMBER_CLASS_NAME)
                            : cn('px-1 font-medium', inMonth ? 'text-zinc-700' : 'text-zinc-400')
                        )}
                      >
                        {/* 每个月的 1 号带上月份，邻月的日子从哪开始一目了然。 */}
                        {format(day, day.getDate() === 1 ? 'M月d日' : 'd')}
                      </span>

                      <span
                        className={cn(
                          'mt-0.5 flex min-w-0 flex-col pl-1',
                          !inMonth && 'opacity-50'
                        )}
                      >
                        {shown.map((task) => {
                          const status = calendarTaskStatus(task, today)
                          const dimmed =
                            activeCourseId !== null && task.courseId !== activeCourseId

                          return (
                            <span
                              key={task.id}
                              className={cn(
                                'flex items-center gap-1 text-[12px] transition-opacity duration-[120ms]',
                                // 做完的淡下去；还黑着的就是没做完的和还没到的。
                                status === 'done' ? 'text-zinc-400' : 'text-zinc-800',
                                dimmed && 'opacity-25'
                              )}
                              style={{ height: TASK_ROW_HEIGHT }}
                            >
                              <CalendarTaskMark
                                status={status}
                                progress={calendarTaskProgress(task)}
                                size={10}
                              />
                              <span className="min-w-0 flex-1 truncate">{task.title}</span>
                            </span>
                          )
                        })}
                        {hiddenCount > 0 && (
                          <span
                            className="flex items-center pl-[14px] text-[12px] text-zinc-500 tabular-nums"
                            style={{ height: TASK_ROW_HEIGHT }}
                          >
                            +{hiddenCount}
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
