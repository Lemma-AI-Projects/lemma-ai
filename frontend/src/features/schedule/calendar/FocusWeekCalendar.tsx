import { useMemo, useState } from 'react'
import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

import { dayKey } from '@/features/schedule/getScheduleTasks'
import { cn } from '@/lib/utils'
import { CalendarTaskMark, CalendarTodayButton } from './CalendarParts'
import {
  CALENDAR_WEEKDAY_LABELS,
  calendarDayLabel,
  calendarTaskProgress,
  calendarTaskStatus,
  getCalendarMonthWeeks,
  type ScheduleCalendarViewProps,
} from './calendarTasks'
import { DayRing } from './DayRing'

// 顶栏的月份条从今天所在的月份往前、往后各列几个月。
const MONTHS_BEFORE = 2
const MONTHS_AFTER = 3

function weekKey(date: Date): string {
  return dayKey(startOfWeek(date, { weekStartsOn: 1 }))
}

// 日历方案（聚焦周）：整个月都在，但只有一周是展开的。
//
// 展开的那一周垫着一块浅灰，每天下面完整列出任务名（放得下两行）；其余几周收成一行圆环，
// 只看节奏。点哪一天，那一周就展开，原来那周收起。这样既有整月的概览，又不用把任务名
// 挤进每个小格子里。
//
// 顶栏左边是一条月份（和首页输入框的模式切换同一种做法），选中的那个月写全年月；
// 右边是「今天」。
export function FocusWeekCalendar({
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarViewProps) {
  const [month, setMonth] = useState(() => startOfMonth(selectedDate))
  // 展开的是哪一周（用那一周周一的日期表示）。和选中的日期分开记：
  // 翻到别的月份时换一周展开，但不改变选中的日期。
  const [focusedWeekKey, setFocusedWeekKey] = useState(() => weekKey(selectedDate))

  const weeks = useMemo(() => getCalendarMonthWeeks(month), [month])
  const months = useMemo(
    () =>
      Array.from({ length: MONTHS_BEFORE + MONTHS_AFTER + 1 }, (_, index) =>
        addMonths(startOfMonth(today), index - MONTHS_BEFORE)
      ),
    [today]
  )

  const showMonth = (next: Date) => {
    setMonth(next)
    const nextWeekKeys = getCalendarMonthWeeks(next).map((week) => dayKey(week[0]))
    // 新的月份里优先展开选中日期所在的那周，其次是今天所在的那周，都不在就展开第一周。
    const preferred = [weekKey(selectedDate), weekKey(today)].find((key) =>
      nextWeekKeys.includes(key)
    )
    setFocusedWeekKey(preferred ?? nextWeekKeys[0])
  }

  const selectDay = (day: Date) => {
    onSelectDate(day)
    setFocusedWeekKey(weekKey(day))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-3">
        <div
          role="tablist"
          aria-label="月份"
          className="scrollbar-hidden flex h-8 min-w-0 items-center overflow-x-auto rounded-full bg-zinc-200/60 p-[3px]"
        >
          {months.map((item) => {
            const selected = isSameMonth(item, month)

            return (
              <button
                key={dayKey(item)}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => showMonth(item)}
                className={cn(
                  'h-[26px] shrink-0 rounded-full px-3 text-[13.5px] leading-none whitespace-nowrap tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400',
                  selected
                    ? 'bg-white font-medium text-zinc-950'
                    : 'text-zinc-500 hover:text-zinc-900'
                )}
              >
                {format(item, selected ? 'yyyy年M月' : 'M月')}
              </button>
            )
          })}
        </div>

        <CalendarTodayButton
          onClick={() => {
            onSelectDate(today)
            setMonth(startOfMonth(today))
            setFocusedWeekKey(weekKey(today))
          }}
        />
      </div>

      <div
        role="table"
        aria-label={format(month, 'yyyy年M月')}
        className="flex min-h-0 flex-1 flex-col px-2 pb-2"
      >
        <div role="row" className="grid h-7 shrink-0 grid-cols-7 gap-0.5 px-1">
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

        <div
          role="rowgroup"
          className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto"
        >
          {weeks.map((week) => {
            const focused = dayKey(week[0]) === focusedWeekKey

            return (
              <div
                key={dayKey(week[0])}
                role="row"
                // 每一周分上下两条轨道：上面一条放圆环，下面一条放任务名（收起时高度为 0）。
                // 多出来的高度由各周平分，全都加在圆环那一条上，所以不管哪一周展开，
                // 每一行圆环的上下间距都一样。
                className={cn(
                  'grid shrink-0 grow basis-auto grid-cols-7 grid-rows-[minmax(44px,1fr)_auto] gap-x-0.5 rounded-[12px] p-1 transition-colors duration-300 motion-reduce:transition-none',
                  focused && 'bg-zinc-100'
                )}
              >
                {week.map((day) => {
                  const isToday = isSameDay(day, today)
                  const inMonth = isSameMonth(day, month)
                  const selected = isSameDay(day, selectedDate)
                  const tasks = tasksByDay.get(dayKey(day)) ?? []

                  return (
                    // 一天占上下两条轨道（subgrid），所以同一周里七天的圆环对齐、任务名也从同一条线开始。
                    <div
                      key={dayKey(day)}
                      role="cell"
                      className="row-span-2 grid min-w-0 grid-rows-subgrid"
                    >
                      <button
                        type="button"
                        aria-label={calendarDayLabel(day, tasks.length)}
                        aria-pressed={selected}
                        aria-current={isToday ? 'date' : undefined}
                        onClick={() => selectDay(day)}
                        className={cn(
                          'row-span-2 grid min-w-0 grid-rows-subgrid rounded-[9px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-inset',
                          // 展开的那周垫着浅灰，选中的那天是一块白片；收起的几周直接在面板上。
                          focused
                            ? selected
                              ? 'bg-white'
                              : 'hover:bg-white/60'
                            : selected
                              ? 'bg-zinc-200/60'
                              : 'hover:bg-zinc-100'
                        )}
                      >
                        <span className="flex items-center justify-center">
                          <DayRing
                            tasks={tasks}
                            today={today}
                            size={32}
                            strokeWidth={3}
                            className={cn(!inMonth && 'opacity-50')}
                          >
                            <span
                              className={cn(
                                'text-[12.5px] leading-none tabular-nums',
                                isToday
                                  ? 'font-semibold text-zinc-950'
                                  : 'font-medium text-zinc-700'
                              )}
                            >
                              {format(day, 'd')}
                            </span>
                            {isToday && (
                              <span className="absolute bottom-[5px] left-1/2 size-[3px] -translate-x-1/2 rounded-full bg-zinc-950" />
                            )}
                          </DayRing>
                        </span>

                        {/* 任务名只在展开的那一周显示。高度用 grid 的 0fr → 1fr 过渡，不用量。 */}
                        <span
                          aria-hidden={!focused}
                          className={cn(
                            'grid min-w-0 transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
                            focused ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                          )}
                        >
                          <span className="min-h-0 overflow-hidden">
                            <span
                              className={cn(
                                'flex min-w-0 flex-col gap-1.5 px-1.5 pt-0.5 pb-2 text-left',
                                !inMonth && 'opacity-50'
                              )}
                            >
                              {tasks.map((task) => {
                                const status = calendarTaskStatus(task, today)

                                return (
                                  <span
                                    key={task.id}
                                    className={cn(
                                      'flex items-start gap-1 text-[12px] leading-4',
                                      status === 'done' ? 'text-zinc-400' : 'text-zinc-800'
                                    )}
                                  >
                                    <CalendarTaskMark
                                      status={status}
                                      progress={calendarTaskProgress(task)}
                                      size={10}
                                      trackColor="#d4d4d8"
                                      className="mt-[3px]"
                                    />
                                    {/* text-balance：折成两行时两行差不多长，不会第二行只剩一个字。 */}
                                    <span className="line-clamp-2 min-w-0 flex-1 break-words text-balance">
                                      {task.title}
                                    </span>
                                  </span>
                                )
                              })}
                            </span>
                          </span>
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
