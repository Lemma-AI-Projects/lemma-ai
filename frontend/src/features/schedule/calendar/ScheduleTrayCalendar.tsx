import { useMemo } from 'react'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { dayKey, type ScheduleTask } from '../getScheduleTasks'
import {
  CalendarDayNumber,
  CalendarDayPeek,
  CalendarDayPeekProvider,
  CalendarIconButton,
  CalendarTextButton,
  CalendarWeekdayRow,
} from './ScheduleCalendarParts'
import {
  describeDay,
  getMonthWeeks,
  getTaskStatus,
  useFollowSelectedDate,
  type ScheduleCalendarProps,
} from './scheduleCalendarShared'

// 一个格子里最多画几个点；再多的用「+N」。
const MAX_DOTS = 10

// 一天的任务画成一排小圆点，一个任务一个点：
// 绿 = 做完，浅绿 = 做了一部分，灰 = 还没开始，浅红 = 过了日子还没做完。
function DayDots({ tasks }: { tasks: readonly ScheduleTask[] }) {
  const visible = tasks.slice(0, MAX_DOTS)
  const hiddenCount = tasks.length - visible.length

  return (
    <span aria-hidden className="flex min-h-[7px] flex-wrap items-center gap-[3px]">
      {visible.map((task) => {
        const status = getTaskStatus(task)

        return (
          <span
            key={task.id}
            className={cn(
              'size-[7px] rounded-full',
              status === 'done'
                ? 'bg-emerald-500'
                : task.overdue
                  ? 'bg-red-300'
                  : status === 'active'
                    ? 'bg-emerald-500/40'
                    : 'bg-zinc-400/60'
            )}
          />
        )
      })}
      {hiddenCount > 0 && (
        <span className="text-[10px] leading-none text-zinc-500 tabular-nums">
          +{hiddenCount}
        </span>
      )}
    </span>
  )
}

// 日历方案「托盘」：整张日历是一块浅灰托盘，和首页输入框是同一种做法。
//
// - 没有单独的顶栏：年月标题、翻月和回到今天都在托盘里的第一行，日历是完整的一块。
// - 格子：托盘里每天一块看不见的瓦片，左上角是日期，左下角是一排小圆点（一个任务一个点）。
// - 状态：悬停时瓦片透出半白，选中的那天是一块纯白的瓦片，不描边；今天的数字是深色圆底。
// - 鼠标在某天上停一下，浮出这天的任务名。
export function ScheduleTrayCalendar({
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarProps) {
  const [month, setMonthStart] = useFollowSelectedDate(selectedDate, startOfMonth)
  const weeks = useMemo(() => getMonthWeeks(month), [month])

  return (
    <CalendarDayPeekProvider>
      <div className="flex min-h-0 flex-1 flex-col p-2">
        {/* 托盘圆角 = 瓦片圆角（14px）+ 托盘内边距（6px）。 */}
        <div
          role="table"
          aria-label={format(month, 'MMMM yyyy')}
          className="flex min-h-0 flex-1 flex-col rounded-[20px] bg-zinc-200/50 p-1.5"
        >
          <div className="flex h-11 shrink-0 items-center justify-between pr-1 pl-[13px]">
            <h2 className="text-[17px] leading-none font-semibold tracking-tight">
              {format(month, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-0.5">
              <CalendarIconButton
                aria-label="Previous month"
                onClick={() => setMonthStart((current) => addMonths(current, -1))}
              >
                <ChevronLeft />
              </CalendarIconButton>
              <CalendarTextButton
                onClick={() => {
                  onSelectDate(today)
                  setMonthStart(startOfMonth(today))
                }}
              >
                Today
              </CalendarTextButton>
              <CalendarIconButton
                aria-label="Next month"
                onClick={() => setMonthStart((current) => addMonths(current, 1))}
              >
                <ChevronRight />
              </CalendarIconButton>
            </div>
          </div>

          {/* 星期和瓦片里的日期数字左对齐在同一条竖线上。 */}
          <CalendarWeekdayRow
            days={weeks[0]}
            align="start"
            className="h-7 gap-1 *:pl-[13px]"
          />
          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
            <div
              role="rowgroup"
              className="grid min-h-full gap-1"
              style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(60px, 1fr))` }}
            >
              {weeks.map((week) => (
                <div key={dayKey(week[0])} role="row" className="grid grid-cols-7 gap-1">
                  {week.map((day) => {
                    const tasks = tasksByDay.get(dayKey(day)) ?? []
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
                              'flex min-w-0 flex-1 rounded-[14px] p-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300',
                              selected ? 'bg-white' : 'hover:bg-white/50'
                            )}
                          >
                            <span
                              className={cn(
                                'flex min-w-0 flex-1 flex-col justify-between',
                                !isSameMonth(day, month) && 'opacity-35'
                              )}
                            >
                              <CalendarDayNumber
                                day={day}
                                isToday={isToday}
                                className={cn(
                                  'self-start',
                                  // 不是今天时不垫圆底，数字往左收，和下面的圆点对齐。
                                  !isToday && 'justify-start px-[5px]'
                                )}
                              />
                              <span className="px-[5px] pb-0.5">
                                <DayDots tasks={tasks} />
                              </span>
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
