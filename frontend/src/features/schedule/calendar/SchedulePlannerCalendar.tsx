import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { dayKey, type ScheduleTask } from '../getScheduleTasks'
import {
  CalendarDayNumber,
  CalendarIconButton,
  CalendarTextButton,
  CalendarWeekdayRow,
  TaskStatusGlyph,
} from './ScheduleCalendarParts'
import {
  describeDay,
  getTaskStatus,
  getWeeks,
  startOfCalendarWeek,
  type ScheduleCalendarProps,
} from './scheduleCalendarShared'

// 往前、往后各能滚多少个月。
const RANGE_MONTHS = 12
// 每一周的行高。固定下来，滚到哪一周、现在看的是哪个月都能直接算。
const ROW_HEIGHT = 116
// 一个格子里最多放几行任务；放不下时最后一行改成「+N」。
const MAX_TASK_ROWS = 4

// 格子里的任务名：每个任务一行，前面是小状态图标。
function PlannerTaskRows({ tasks }: { tasks: readonly ScheduleTask[] }) {
  const visible =
    tasks.length > MAX_TASK_ROWS ? tasks.slice(0, MAX_TASK_ROWS - 1) : tasks
  const hiddenCount = tasks.length - visible.length

  return (
    <ul className="flex min-w-0 flex-col">
      {visible.map((task) => (
        <li key={task.id} className="flex h-[18px] min-w-0 items-center gap-1.5">
          <TaskStatusGlyph task={task} size={10} />
          <span
            className={cn(
              'min-w-0 truncate text-[12px] leading-[18px]',
              getTaskStatus(task) === 'done' ? 'text-zinc-400' : 'text-zinc-800'
            )}
          >
            {task.title}
          </span>
        </li>
      ))}
      {hiddenCount > 0 && (
        <li className="h-[18px] pl-4 text-[12px] leading-[18px] text-zinc-500 tabular-nums">
          +{hiddenCount}
        </li>
      )}
    </ul>
  )
}

// 日历方案「清单」：一张可以一直往下滚的周历表，任务名直接写在格子里，不点开也能读。
//
// - 没有「翻到上个月 / 下个月」这种整页切换：所有的周连成一长卷，上下滚动就是翻月，
//   停下时自动对齐到整周。
// - 顶栏：左边的年月标题跟着滚动变，说的是现在占了画面中间的那个月；这个月以外的日子
//   会退后一档。右边可以按月跳，也可以回到今天。
// - 格子：周与周之间只有一条细横线，没有竖线和边框。每月一号写成「Dec 1」。
// - 状态：悬停和选中都只是垫一块圆角底色；今天的数字是深色圆底。
export function SchedulePlannerCalendar({
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const weeks = useMemo(() => {
    const firstMonday = startOfCalendarWeek(
      startOfMonth(addMonths(today, -RANGE_MONTHS))
    )
    const lastDay = endOfMonth(addMonths(today, RANGE_MONTHS))
    return getWeeks(
      firstMonday,
      Math.ceil((differenceInCalendarDays(lastDay, firstMonday) + 1) / 7)
    )
  }, [today])
  const firstMonday = weeks[0][0]
  // 现在占了画面中间的那个月。
  const [focusMonth, setFocusMonth] = useState(() => startOfMonth(selectedDate))
  // 一打开就滚到的位置：所选日期那个月的第一周。
  const [initialScrollTop] = useState(
    () => weekIndexOf(firstMonday, startOfMonth(selectedDate)) * ROW_HEIGHT
  )

  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = initialScrollTop
    }
  }, [initialScrollTop])

  // 选中的日期不在画面里时（比如左栏点了回到今天），滚到它那个月。
  useEffect(() => {
    const viewport = scrollRef.current
    if (!viewport) {
      return
    }
    const rowTop = weekIndexOf(firstMonday, selectedDate) * ROW_HEIGHT
    const visible =
      rowTop >= viewport.scrollTop &&
      rowTop + ROW_HEIGHT <= viewport.scrollTop + viewport.clientHeight
    if (!visible) {
      viewport.scrollTo({
        top: weekIndexOf(firstMonday, startOfMonth(selectedDate)) * ROW_HEIGHT,
        behavior: 'smooth',
      })
    }
  }, [firstMonday, selectedDate])

  const scrollToMonth = (month: Date) => {
    scrollRef.current?.scrollTo({
      top: weekIndexOf(firstMonday, startOfMonth(month)) * ROW_HEIGHT,
      behavior: 'smooth',
    })
  }

  const handleScroll = () => {
    const viewport = scrollRef.current
    if (!viewport) {
      return
    }
    const middle = viewport.scrollTop + viewport.clientHeight / 2
    const index = Math.min(
      Math.max(Math.floor(middle / ROW_HEIGHT), 0),
      weeks.length - 1
    )
    // 一周算在它周四所在的那个月里。
    const month = startOfMonth(weeks[index][3])
    setFocusMonth((current) => (isSameMonth(current, month) ? current : month))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-[56px] shrink-0 items-center justify-between pr-3 pl-5">
        <h2 className="text-[20px] leading-none font-semibold tracking-tight">
          {format(focusMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-0.5">
          <CalendarIconButton
            aria-label="Previous month"
            onClick={() => scrollToMonth(addMonths(focusMonth, -1))}
          >
            <ChevronLeft />
          </CalendarIconButton>
          <CalendarTextButton
            onClick={() => {
              onSelectDate(today)
              scrollToMonth(today)
            }}
          >
            Today
          </CalendarTextButton>
          <CalendarIconButton
            aria-label="Next month"
            onClick={() => scrollToMonth(addMonths(focusMonth, 1))}
          >
            <ChevronRight />
          </CalendarIconButton>
        </div>
      </div>

      <div
        role="table"
        aria-label="Schedule"
        className="flex min-h-0 flex-1 flex-col px-3"
      >
        {/* 星期和格子里的日期数字左对齐在同一条竖线上。 */}
        <CalendarWeekdayRow
          days={weeks[0]}
          align="start"
          className="h-7 border-b border-zinc-200/70 pb-1 *:pl-[13px]"
        />
        <div
          ref={scrollRef}
          role="rowgroup"
          onScroll={handleScroll}
          className="scrollbar-hidden min-h-0 flex-1 snap-y snap-proximity overflow-y-auto"
        >
          {weeks.map((week, weekIndex) => (
            <div
              key={dayKey(week[0])}
              role="row"
              className={cn(
                'grid snap-start grid-cols-7',
                weekIndex > 0 && 'border-t border-zinc-200/70'
              )}
              style={{ height: ROW_HEIGHT }}
            >
              {week.map((day) => {
                const tasks = tasksByDay.get(dayKey(day)) ?? []
                const selected = isSameDay(day, selectedDate)
                const isToday = isSameDay(day, today)
                const inFocus = isSameMonth(day, focusMonth)

                return (
                  <div key={dayKey(day)} role="cell" className="flex min-w-0 p-0.5">
                    <button
                      type="button"
                      aria-label={describeDay(day, tasks.length)}
                      aria-pressed={selected}
                      onClick={() => onSelectDate(day)}
                      className={cn(
                        'flex min-w-0 flex-1 flex-col gap-1 rounded-[10px] p-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300',
                        selected ? 'bg-black/[0.06]' : 'hover:bg-black/[0.035]'
                      )}
                    >
                      <CalendarDayNumber
                        day={day}
                        isToday={isToday}
                        label={day.getDate() === 1 ? format(day, 'MMM d') : undefined}
                        className={cn(
                          'self-start transition-opacity duration-200',
                          // 不是今天时不垫圆底，数字往左收一点，和任务行的图标对齐。
                          !isToday && 'justify-start px-[5px]',
                          !inFocus && !isToday && 'opacity-40'
                        )}
                      />
                      <div
                        className={cn(
                          'min-w-0 px-[5px] transition-opacity duration-200',
                          !inFocus && 'opacity-40'
                        )}
                      >
                        <PlannerTaskRows tasks={tasks} />
                      </div>
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

// 某一天在第几周（从这张表的第一个周一数起）。
function weekIndexOf(firstMonday: Date, date: Date): number {
  return Math.floor(differenceInCalendarDays(date, firstMonday) / 7)
}
