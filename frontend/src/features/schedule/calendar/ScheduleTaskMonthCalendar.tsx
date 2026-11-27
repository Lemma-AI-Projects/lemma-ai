import { useMemo } from 'react'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'

import { cn } from '@/lib/utils'
import { dayKey, type ScheduleTask } from '../getScheduleTasks'
import { ScheduleCalendarHeader } from './ScheduleCalendarHeader'
import {
  CalendarDayNumber,
  CalendarWeekdayRow,
  TaskStatusGlyph,
} from './ScheduleCalendarParts'
import {
  describeDay,
  getMonthWeeksToEnd,
  getTaskStatus,
  isTaskDimmed,
  listCourses,
  useCourseHighlight,
  useFollowSelectedDate,
  type ScheduleCalendarProps,
} from './scheduleCalendarShared'

// 格子里的一个任务：一行文字，前面一个小状态图标。
function TaskRow({ dimmed, task }: { dimmed: boolean; task: ScheduleTask }) {
  return (
    <li
      className={cn(
        'flex h-[18px] min-w-0 items-center gap-1.5 px-[5px] transition-opacity duration-150',
        dimmed && 'opacity-25'
      )}
    >
      <TaskStatusGlyph task={task} size={11} quiet />
      <span
        className={cn(
          'min-w-0 truncate text-[12.5px] leading-none',
          // 做完的退后一档；还深着的就是没做完的。
          getTaskStatus(task) === 'done' ? 'text-zinc-500' : 'text-zinc-950'
        )}
      >
        {task.title}
      </span>
    </li>
  )
}

// 日历方案「任务月历 2」：传统的月历格子，每天的任务名直接写在格子里，而且全部写出来。
//
// - 不设「最多几条」：每一周的行高跟着这一周里最忙的那天走，那天有几件事就有多高；
//   其余的高度各周平分。整个月放不下时在格子区里上下滚。
// - 顶栏：年月、课程、翻月。鼠标移到一门课上，这门课的任务留着、其它的淡下去。
// - 格子：周与周之间一条细横线，没有竖线和边框。每月一号写成「Dec 1」。
// - 状态：悬停和选中都只是垫一块圆角底色；今天的数字是深色圆底。
export function ScheduleTaskMonthCalendar({
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
        className="flex min-h-0 flex-1 flex-col px-3"
      >
        {/* 星期和格子里的日期数字左对齐在同一条竖线上。 */}
        <CalendarWeekdayRow days={weeks[0]} align="start" className="h-7 *:pl-[13px]" />
        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
          <div
            role="rowgroup"
            // 高度定成和滚动区一样高：每一行至少是自己内容的高度，多出来的高度各行平分；
            // 所有行的内容加起来比滚动区还高时，格子溢出去，滚动区就能滚。
            // （不能用 min-h-full：高度不确定时，所有行都会被拉得和最高的那一行一样高。）
            className="grid h-full"
            style={{
              gridTemplateRows: `repeat(${weeks.length}, minmax(min-content, 1fr))`,
            }}
          >
            {weeks.map((week) => (
              <div
                key={dayKey(week[0])}
                role="row"
                className="grid grid-cols-7 border-t border-zinc-200/70"
              >
                {week.map((day) => {
                  const tasks = tasksByDay.get(dayKey(day)) ?? []
                  const selected = isSameDay(day, selectedDate)
                  const isToday = isSameDay(day, today)
                  const inMonth = isSameMonth(day, month)

                  return (
                    <div key={dayKey(day)} role="cell" className="flex min-w-0 p-0.5">
                      <button
                        type="button"
                        aria-label={describeDay(day, tasks.length)}
                        aria-pressed={selected}
                        onClick={() => onSelectDate(day)}
                        className={cn(
                          'flex min-w-0 flex-1 flex-col gap-0.5 rounded-[10px] px-1.5 pt-1 pb-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300',
                          selected ? 'bg-black/[0.06]' : 'hover:bg-black/[0.035]'
                        )}
                      >
                        <CalendarDayNumber
                          day={day}
                          isToday={isToday}
                          label={day.getDate() === 1 ? format(day, 'MMM d') : undefined}
                          className={cn(
                            'self-start text-[14px]',
                            // 不是今天时不垫圆底，数字往左收，和下面的任务对齐。
                            !isToday && 'justify-start px-[5px]',
                            !inMonth && !isToday && 'text-zinc-400'
                          )}
                        />
                        {tasks.length > 0 && (
                          <ul
                            className={cn(
                              'flex min-w-0 flex-col',
                              !inMonth && 'opacity-50'
                            )}
                          >
                            {tasks.map((task) => (
                              <TaskRow
                                key={task.id}
                                task={task}
                                dimmed={isTaskDimmed(task, highlight)}
                              />
                            ))}
                          </ul>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
