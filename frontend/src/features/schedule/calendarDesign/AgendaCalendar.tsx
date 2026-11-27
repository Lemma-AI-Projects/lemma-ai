import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
} from 'date-fns'

import { dayKey } from '@/features/schedule/getScheduleTasks'
import { cn } from '@/lib/utils'
import { CalendarTaskMark, CalendarTodayButton } from './CalendarParts'
import { CALENDAR_TODAY_NUMBER_CLASS_NAME } from './calendarStyles'
import {
  CALENDAR_WEEKDAY_LABELS,
  calendarDayLabel,
  calendarTaskProgress,
  calendarTaskStatus,
  type ScheduleCalendarViewProps,
} from './calendarTasks'

// 从今天所在的月份往前、往后各列几个月。
const MONTHS_BEFORE = 2
const MONTHS_AFTER = 3
// 月份标题那一行的高度（h-12）。
const MONTH_HEADER_HEIGHT = 48

// 日历方案（日程流）：不是格子，是一条从上往下连着滚的日程。
//
// 一天一行：左边是日期，右边是这天的任务，每项任务一枚白色胶囊；没有任务的日子只留日期。
// 一周和一周之间一条细线。月份标题滚到顶上就停住，所以不需要翻月：往上是过去，往下是以后。
// 打开时停在今天；滚远了点右上角的「今天」回来。
export function AgendaCalendar({
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayRowRef = useRef<HTMLButtonElement>(null)

  const months = useMemo(
    () =>
      Array.from({ length: MONTHS_BEFORE + MONTHS_AFTER + 1 }, (_, index) => {
        const month = addMonths(startOfMonth(today), index - MONTHS_BEFORE)
        return {
          month,
          days: eachDayOfInterval({ start: month, end: endOfMonth(month) }),
        }
      }),
    [today]
  )

  // 把今天那一行滚到月份标题的正下方。
  const scrollToToday = (behavior: ScrollBehavior) => {
    const container = scrollRef.current
    const row = todayRowRef.current
    if (!container || !row) return
    container.scrollTo({ top: row.offsetTop - MONTH_HEADER_HEIGHT - 4, behavior })
  }

  useLayoutEffect(() => {
    scrollToToday('auto')
  }, [])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <CalendarTodayButton
        className="absolute top-2.5 right-4 z-20"
        onClick={() => {
          onSelectDate(today)
          scrollToToday('smooth')
        }}
      />

      {/* relative：让每一行的 offsetTop 相对这个滚动区计算。 */}
      <div ref={scrollRef} className="scrollbar-hidden relative min-h-0 flex-1 overflow-y-auto">
        {months.map(({ month, days }) => (
          <section key={dayKey(month)} aria-label={format(month, 'yyyy年M月')} className="pb-3">
            <div className="sticky top-0 z-10 flex h-12 items-center bg-zinc-50 px-4">
              <h2 className="text-[19.5px] leading-7 font-semibold tracking-tight text-zinc-950 tabular-nums">
                {format(month, 'yyyy年M月')}
              </h2>
            </div>

            <div className="flex flex-col px-2">
              {days.map((day, index) => {
                const isToday = isSameDay(day, today)
                const selected = isSameDay(day, selectedDate)
                const tasks = tasksByDay.get(dayKey(day)) ?? []
                // 周一为 0。
                const weekday = (day.getDay() + 6) % 7

                return (
                  <div key={dayKey(day)}>
                    {/* 每周一上面一条细线，把一周一周分开。 */}
                    {weekday === 0 && index > 0 && (
                      <div aria-hidden className="mx-2 my-1.5 h-px bg-zinc-200/80" />
                    )}
                    <button
                      ref={isToday ? todayRowRef : undefined}
                      type="button"
                      aria-label={calendarDayLabel(day, tasks.length)}
                      aria-pressed={selected}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={() => onSelectDate(day)}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-[10px] px-2 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-inset',
                        selected ? 'bg-zinc-200/60' : 'hover:bg-zinc-100'
                      )}
                    >
                      <span className="flex h-7 w-[76px] shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex size-7 items-center justify-center rounded-full text-[14px] leading-none tabular-nums',
                            isToday
                              ? CALENDAR_TODAY_NUMBER_CLASS_NAME
                              : cn(
                                  'font-medium',
                                  tasks.length > 0 ? 'text-zinc-800' : 'text-zinc-400'
                                )
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        <span
                          className={cn(
                            'text-[12.5px] leading-none',
                            isToday
                              ? 'font-medium text-zinc-950'
                              : tasks.length > 0
                                ? 'text-zinc-500'
                                : 'text-zinc-400'
                          )}
                        >
                          {isToday ? '今天' : `周${CALENDAR_WEEKDAY_LABELS[weekday]}`}
                        </span>
                      </span>

                      <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                        {tasks.map((task) => {
                          const status = calendarTaskStatus(task, today)

                          return (
                            <span
                              key={task.id}
                              className={cn(
                                'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-white pr-2.5 pl-2 text-[13px] leading-none ring-1 ring-zinc-200 ring-inset',
                                status === 'done' ? 'text-zinc-400' : 'text-zinc-800'
                              )}
                            >
                              <CalendarTaskMark
                                status={status}
                                progress={calendarTaskProgress(task)}
                                size={12}
                              />
                              <span className="min-w-0 truncate">{task.title}</span>
                            </span>
                          )
                        })}
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
