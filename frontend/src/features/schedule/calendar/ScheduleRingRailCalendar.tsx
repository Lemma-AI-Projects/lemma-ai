import { useMemo } from 'react'
import { format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'

import { cn } from '@/lib/utils'
import { dayKey } from '../getScheduleTasks'
import { CalendarMonthRail } from './CalendarMonthRail'
import { DayRing } from './DayRing'
import {
  CalendarDayNumber,
  CalendarDayPeek,
  CalendarDayPeekProvider,
  CalendarWeekdayRow,
} from './ScheduleCalendarParts'
import {
  describeDay,
  getMonthWeeksToEnd,
  summarizeMonths,
  useFollowSelectedDate,
  type ScheduleCalendarProps,
} from './scheduleCalendarShared'

// 圆环的直径和线宽。
const RING_SIZE = 48
const RING_STROKE_WIDTH = 3

// 日历方案「日环月历 2」：在「日环月历」的基础上只调比例，布局不变
// （左边一栏月份，右边是这个月的格子，没有顶栏；格子里一圈分段的圆环）。
//
// 调了什么：
// - 日期数字从 13px 的中灰加大到 16px 的深色，数字是主角；
// - 圆环变细、变大一点（线宽 3.5 → 3，直径 40 → 48），退到数字后面当陪衬；
// - 没有任务的日子数字浅一档，有任务的日子才是深色；
// - 今天不再是数字下面的一个小点，而是深色圆底，一眼找得到。
export function ScheduleRingRailCalendar({
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarProps) {
  const [month, setMonthStart] = useFollowSelectedDate(selectedDate, startOfMonth)
  const weeks = useMemo(() => getMonthWeeksToEnd(month), [month])
  const summaries = useMemo(() => summarizeMonths(tasksByDay), [tasksByDay])

  return (
    <CalendarDayPeekProvider>
      <div className="flex min-h-0 flex-1 gap-1.5 p-1.5">
        <CalendarMonthRail
          month={month}
          today={today}
          summaries={summaries}
          onMonthChange={(next) => setMonthStart(startOfMonth(next))}
          onBackToToday={() => {
            onSelectDate(today)
            setMonthStart(startOfMonth(today))
          }}
        />

        <div
          role="table"
          aria-label={format(month, 'MMMM yyyy')}
          className="flex min-w-0 flex-1 flex-col rounded-[8px] bg-zinc-100 p-1.5"
        >
          <CalendarWeekdayRow days={weeks[0]} className="h-8 gap-0.5" />
          <div
            role="rowgroup"
            className="grid min-h-0 flex-1 gap-0.5"
            style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
          >
            {weeks.map((week) => (
              <div key={dayKey(week[0])} role="row" className="grid grid-cols-7 gap-0.5">
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
                            'flex min-w-0 flex-1 items-center justify-center rounded-[12px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-inset',
                            selected ? 'bg-white' : 'hover:bg-white/60'
                          )}
                        >
                          <span
                            className={cn(
                              'relative flex items-center justify-center',
                              // 邻月的日子整体淡一档。
                              !isSameMonth(day, month) && 'opacity-40'
                            )}
                            style={{ width: RING_SIZE, height: RING_SIZE }}
                          >
                            <DayRing
                              tasks={tasks}
                              size={RING_SIZE}
                              strokeWidth={RING_STROKE_WIDTH}
                              trackColor="#d4d4d8"
                              className="absolute inset-0"
                            />
                            <CalendarDayNumber
                              day={day}
                              isToday={isToday}
                              className={cn(
                                'h-7 min-w-7 text-[16px]',
                                isToday
                                  ? 'text-[15px] font-semibold'
                                  : tasks.length > 0
                                    ? 'text-zinc-950'
                                    : 'font-normal text-zinc-500'
                              )}
                            />
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
    </CalendarDayPeekProvider>
  )
}
