import { useMemo, useState, type ReactNode } from 'react'
import {
  addYears,
  format,
  isSameDay,
  isSameMonth,
  setMonth as withMonthIndex,
  startOfMonth,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'

import { CircularProgress } from '@/components/CircularProgress'
import { dayKey } from '@/features/schedule/getScheduleTasks'
import { cn } from '@/lib/utils'
import {
  CalendarIconButton,
  CalendarTaskMark,
  CalendarTodayButton,
} from './CalendarParts'
import { CALENDAR_TODAY_NUMBER_CLASS_NAME } from './calendarStyles'
import {
  CALENDAR_WEEKDAY_LABELS,
  calendarDayLabel,
  calendarTaskProgress,
  calendarTaskStatus,
  getCalendarMonthWeeks,
  type CalendarTask,
  type ScheduleCalendarViewProps,
} from './calendarTasks'
import { DayDots } from './DayDots'
import { DayRing } from './DayRing'

// 格子里用什么表示这天的任务：
// - ring：日期数字外面一圈分段的圆环；
// - dots：日期数字下面一排圆点。
export type RingMonthMark = 'ring' | 'dots'

interface MonthSummary {
  total: number
  done: number
  // 这个月的任务是不是全都排在今天之后。
  allPlanned: boolean
}

function monthKey(date: Date): string {
  return format(date, 'yyyy-MM')
}

function summarizeMonths(
  tasksByDay: ReadonlyMap<string, readonly CalendarTask[]>,
  today: Date
): Map<string, MonthSummary> {
  const summaries = new Map<string, MonthSummary>()
  for (const tasks of tasksByDay.values()) {
    for (const task of tasks) {
      const key = monthKey(task.date)
      const summary = summaries.get(key) ?? { total: 0, done: 0, allPlanned: true }
      const status = calendarTaskStatus(task, today)
      summary.total += 1
      if (status === 'done') summary.done += 1
      if (status !== 'planned') summary.allPlanned = false
      summaries.set(key, summary)
    }
  }
  return summaries
}

// 左边的月份栏：最上面是年份，下面是这一年的十二个月，最下面是「今天」。
// 每个月后面的小圆环是那个月做完了多少；还没开始的月份是一圈虚线，没有安排就不画。
function MonthRail({
  month,
  onBackToToday,
  onMonthChange,
  summaries,
  today,
}: {
  month: Date
  onBackToToday: () => void
  onMonthChange: (month: Date) => void
  summaries: ReadonlyMap<string, MonthSummary>
  today: Date
}) {
  return (
    <div className="flex w-[100px] shrink-0 flex-col">
      <div className="flex h-8 shrink-0 items-center justify-between pl-2.5">
        <span className="text-[15px] font-semibold text-zinc-950 tabular-nums">
          {format(month, 'yyyy')}
        </span>
        <div className="flex items-center">
          <CalendarIconButton
            aria-label="上一年"
            onClick={() => onMonthChange(addYears(month, -1))}
          >
            <ChevronLeft />
          </CalendarIconButton>
          <CalendarIconButton
            aria-label="下一年"
            onClick={() => onMonthChange(addYears(month, 1))}
          >
            <ChevronRight />
          </CalendarIconButton>
        </div>
      </div>

      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label="月份"
        className="scrollbar-hidden mt-1 flex min-h-0 flex-col gap-0.5 overflow-y-auto"
      >
        {Array.from({ length: 12 }, (_, index) => {
          const item = withMonthIndex(month, index)
          const selected = index === month.getMonth()
          const summary = summaries.get(monthKey(item))

          return (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onMonthChange(item)}
              className={cn(
                'flex h-8 shrink-0 items-center rounded-sm px-2.5 text-[14px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-inset',
                selected
                  ? 'bg-zinc-200/60 font-medium text-zinc-950'
                  : cn(
                      'hover:bg-zinc-100 hover:text-zinc-950',
                      isSameMonth(item, today)
                        ? 'font-medium text-zinc-950'
                        : 'text-zinc-600'
                    )
              )}
            >
              <span className="flex-1 text-left tabular-nums">{index + 1}月</span>
              {summary &&
                (summary.allPlanned ? (
                  <CalendarTaskMark status="planned" progress={0} size={14} />
                ) : (
                  <CircularProgress
                    value={(summary.done / summary.total) * 100}
                    size={14}
                    strokeWidth={2.5}
                    trackColor="#d4d4d8"
                  />
                ))}
            </button>
          )
        })}
      </div>

      <div className="mt-auto flex shrink-0 px-1 pt-2 pb-1">
        <CalendarTodayButton onClick={onBackToToday} className="w-full justify-center" />
      </div>
    </div>
  )
}

// 鼠标停在某一天上，旁边浮出这天的任务，不用先点进去。
function DayPeek({
  children,
  tasks,
  today,
}: {
  children: ReactNode
  tasks: readonly CalendarTask[]
  today: Date
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="right"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 w-fit max-w-52 min-w-36 animate-in rounded-lg border bg-popover p-1 text-popover-foreground fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <ul>
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-2.5 px-2 py-1.5 text-[14px] leading-5 text-zinc-950"
              >
                <CalendarTaskMark
                  status={calendarTaskStatus(task, today)}
                  progress={calendarTaskProgress(task)}
                  size={16}
                />
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
              </li>
            ))}
          </ul>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

// 日历方案（日环月历）：左边一栏月份，右边是这个月的格子，没有顶栏。
//
// 格子里不写任务名，只看节奏：日期数字外面一圈圆环（或下面一排圆点），
// 一眼看出哪天有事、有几件、做完了多少。想看是什么事，鼠标停一下，或点一下看左栏。
//
// 配色和首页输入框是同一套：浅灰的托盘上，选中的那天是一块白片，悬停是半透明的白。
export function RingMonthCalendar({
  mark = 'ring',
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarViewProps & { mark?: RingMonthMark }) {
  const [month, setMonth] = useState(() => startOfMonth(selectedDate))
  const weeks = useMemo(() => getCalendarMonthWeeks(month), [month])
  const summaries = useMemo(() => summarizeMonths(tasksByDay, today), [tasksByDay, today])

  const selectDay = (day: Date) => {
    onSelectDate(day)
    setMonth(startOfMonth(day))
  }

  return (
    <div className="flex min-h-0 flex-1 gap-1.5 p-1.5">
      <MonthRail
        month={month}
        today={today}
        summaries={summaries}
        onMonthChange={(next) => setMonth(startOfMonth(next))}
        onBackToToday={() => selectDay(today)}
      />

      <div
        role="table"
        aria-label={format(month, 'yyyy年M月')}
        className="flex min-w-0 flex-1 flex-col rounded-[8px] bg-zinc-100 p-1.5"
      >
        <div role="row" className="grid h-8 shrink-0 grid-cols-7 gap-0.5">
          {CALENDAR_WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              role="columnheader"
              className="flex items-center justify-center text-[12.5px] text-zinc-500"
            >
              {label}
            </div>
          ))}
        </div>

        <TooltipPrimitive.Provider delayDuration={350} skipDelayDuration={200}>
          <div
            role="rowgroup"
            className="grid min-h-0 flex-1 gap-0.5"
            style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
          >
            {weeks.map((week) => (
              <div key={dayKey(week[0])} role="row" className="grid grid-cols-7 gap-0.5">
                {week.map((day) => {
                  const isToday = isSameDay(day, today)
                  const inMonth = isSameMonth(day, month)
                  const selected = isSameDay(day, selectedDate)
                  const tasks = tasksByDay.get(dayKey(day)) ?? []

                  const cell = (
                    <button
                      type="button"
                      aria-label={calendarDayLabel(day, tasks.length)}
                      aria-pressed={selected}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={() => selectDay(day)}
                      className={cn(
                        'flex min-w-0 flex-1 items-center justify-center rounded-[12px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-inset',
                        selected ? 'bg-white' : 'hover:bg-white/60'
                      )}
                    >
                      {mark === 'ring' ? (
                        <DayRing
                          tasks={tasks}
                          today={today}
                          size={40}
                          strokeWidth={3.5}
                          // 邻月的日子整体淡一档。
                          className={cn(!inMonth && 'opacity-50')}
                        >
                          <span
                            className={cn(
                              'text-[13px] leading-none tabular-nums',
                              isToday
                                ? 'font-semibold text-zinc-950'
                                : 'font-medium text-zinc-700'
                            )}
                          >
                            {format(day, 'd')}
                          </span>
                          {/* 今天：数字下面一个小圆点。 */}
                          {isToday && (
                            <span className="absolute bottom-[7px] left-1/2 size-[3px] -translate-x-1/2 rounded-full bg-zinc-950" />
                          )}
                        </DayRing>
                      ) : (
                        <span
                          className={cn(
                            'flex flex-col items-center gap-1.5',
                            !inMonth && 'opacity-50'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-flex size-7 items-center justify-center rounded-full text-[13.5px] leading-none tabular-nums',
                              isToday
                                ? CALENDAR_TODAY_NUMBER_CLASS_NAME
                                : 'font-medium text-zinc-700'
                            )}
                          >
                            {format(day, 'd')}
                          </span>
                          <DayDots tasks={tasks} today={today} />
                        </span>
                      )}
                    </button>
                  )

                  return (
                    <div key={dayKey(day)} role="cell" className="flex min-w-0">
                      {tasks.length > 0 ? (
                        <DayPeek tasks={tasks} today={today}>
                          {cell}
                        </DayPeek>
                      ) : (
                        cell
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </TooltipPrimitive.Provider>
      </div>
    </div>
  )
}
