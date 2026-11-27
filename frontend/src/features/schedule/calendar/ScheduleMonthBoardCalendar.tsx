import { useMemo } from 'react'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'

import { cn } from '@/lib/utils'
import { dayKey, type ScheduleTask } from '../getScheduleTasks'
import { ScheduleCalendarHeader } from './ScheduleCalendarHeader'
import {
  CalendarDayNumber,
  CalendarDayPeek,
  CalendarDayPeekProvider,
  CalendarWeekdayRow,
  TaskStatusGlyph,
} from './ScheduleCalendarParts'
import {
  describeDay,
  getMonthWeeks,
  getTaskStatus,
  getWeeks,
  isTaskDimmed,
  listCourses,
  startOfCalendarWeek,
  useCourseHighlight,
  useFollowSelectedDate,
  type CourseHighlight,
  type ScheduleCalendarProps,
} from './scheduleCalendarShared'

// 月历里一天下面的小圆点：这天有任务才有。
// 绿 = 都做完了，浅红 = 有过了日子还没做完的，灰 = 还有没做的。
function dayDotClassName(tasks: readonly ScheduleTask[]): string {
  if (tasks.length === 0) {
    return 'bg-transparent'
  }
  if (tasks.every((task) => getTaskStatus(task) === 'done')) {
    return 'bg-emerald-500'
  }
  return tasks.some((task) => task.overdue) ? 'bg-red-300' : 'bg-zinc-400'
}

// 突出某门课时，只算这门课的任务。
function highlightedTasks(
  tasks: readonly ScheduleTask[],
  highlight: CourseHighlight
): readonly ScheduleTask[] {
  return highlight.active === null
    ? tasks
    : tasks.filter((task) => !isTaskDimmed(task, highlight))
}

// 日历方案「月历加周栏」：上面一张紧凑的传统月历，下面是所选那一周的七栏，
// 每一栏把那天的任务完整列出来。
//
// - 月历只管「哪天有事」：格子小，日期数字就是主角；有任务的日子数字下面一个小圆点。
// - 周栏管「是什么事」：任务名可以折行，写全；一天再多也不截断，周栏自己上下滚。
// - 选中的那一周是一条浅灰轨道，选中的那天是轨道里的一块白片，
//   和首页输入框里选学习日是同一种做法。
// - 顶栏：年月、课程、翻月。突出一门课时，月历里只有这门课的日子还带圆点，周栏里其它课淡下去。
export function ScheduleMonthBoardCalendar({
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarProps) {
  const [month, setMonthStart] = useFollowSelectedDate(selectedDate, startOfMonth)
  const weeks = useMemo(() => getMonthWeeks(month), [month])
  const courses = useMemo(() => listCourses(tasksByDay), [tasksByDay])
  const highlight = useCourseHighlight()
  const selectedWeekStart = startOfCalendarWeek(selectedDate)
  const boardDays = getWeeks(selectedWeekStart, 1)[0]

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

        <div role="table" aria-label={format(month, 'MMMM yyyy')} className="shrink-0 px-3">
          <CalendarWeekdayRow days={weeks[0]} className="h-7 px-[3px]" />
          <div role="rowgroup" className="flex flex-col gap-0.5">
            {weeks.map((week) => {
              const inSelectedWeek = isSameDay(week[0], selectedWeekStart)

              return (
                <div
                  key={dayKey(week[0])}
                  role="row"
                  className={cn(
                    'grid h-10 grid-cols-7 rounded-full p-[3px] transition-colors',
                    inSelectedWeek && 'bg-zinc-200/60'
                  )}
                >
                  {week.map((day) => {
                    const tasks = tasksByDay.get(dayKey(day)) ?? []
                    const marked = highlightedTasks(tasks, highlight)
                    const selected = isSameDay(day, selectedDate)
                    const isToday = isSameDay(day, today)

                    return (
                      <div key={dayKey(day)} role="cell" className="flex min-w-0">
                        <CalendarDayPeek tasks={tasks}>
                          <button
                            type="button"
                            aria-label={describeDay(day, tasks.length)}
                            aria-pressed={selected}
                            onClick={() => onSelectDate(day)}
                            className={cn(
                              'flex min-w-0 flex-1 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300',
                              selected
                                ? 'bg-white'
                                : inSelectedWeek
                                  ? 'hover:bg-white/50'
                                  : 'hover:bg-black/[0.04]'
                            )}
                          >
                            <span
                              className={cn(
                                'flex flex-col items-center gap-0.5',
                                !isSameMonth(day, month) && 'opacity-35'
                              )}
                            >
                              <CalendarDayNumber
                                day={day}
                                isToday={isToday}
                                className={cn(
                                  'h-6 min-w-6 text-[15px]',
                                  // 没有任务（或没有正在看的这门课）的日子，数字退后一档。
                                  marked.length === 0 &&
                                    !isToday &&
                                    'font-normal text-zinc-400'
                                )}
                              />
                              <span
                                aria-hidden
                                className={cn(
                                  'size-1 rounded-full',
                                  dayDotClassName(marked)
                                )}
                              />
                            </span>
                          </button>
                        </CalendarDayPeek>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-2.5 flex min-h-0 flex-1 flex-col px-3">
          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto border-t border-zinc-200/70 py-1.5">
            <div className="grid min-h-full grid-cols-7 px-[3px]">
              {boardDays.map((day) => {
                const tasks = tasksByDay.get(dayKey(day)) ?? []
                const selected = isSameDay(day, selectedDate)

                return (
                  <button
                    key={dayKey(day)}
                    type="button"
                    aria-label={describeDay(day, tasks.length)}
                    aria-pressed={selected}
                    onClick={() => onSelectDate(day)}
                    className={cn(
                      'flex min-w-0 flex-col gap-1.5 rounded-xl px-2 pt-2 pb-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300',
                      selected ? 'bg-black/[0.05]' : 'hover:bg-black/[0.03]'
                    )}
                  >
                    <span className="flex h-6 items-center gap-1.5 text-[13px] leading-none">
                      <span className="text-zinc-500">{format(day, 'EEE')}</span>
                      <CalendarDayNumber
                        day={day}
                        isToday={isSameDay(day, today)}
                        className={cn(!isSameDay(day, today) && 'min-w-0')}
                      />
                    </span>
                    <ul className="flex min-w-0 flex-col gap-1.5">
                      {tasks.map((task) => (
                        <li
                          key={task.id}
                          className={cn(
                            'flex min-w-0 items-start gap-1.5 transition-opacity duration-150',
                            isTaskDimmed(task, highlight) && 'opacity-25'
                          )}
                        >
                          <TaskStatusGlyph task={task} size={11} quiet className="mt-[3px]" />
                          <span
                            className={cn(
                              // 任务名写全、可以折行。
                              'min-w-0 text-[12.5px] leading-[17px] break-words',
                              getTaskStatus(task) === 'done'
                                ? 'text-zinc-500'
                                : 'text-zinc-950'
                            )}
                          >
                            {task.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </CalendarDayPeekProvider>
  )
}
