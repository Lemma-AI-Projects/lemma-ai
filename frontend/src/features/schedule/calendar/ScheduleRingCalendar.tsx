import { useMemo } from 'react'
import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  setMonth,
  startOfMonth,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { dayKey } from '../getScheduleTasks'
import { DayRing } from './DayRing'
import {
  CalendarDayNumber,
  CalendarDayPeek,
  CalendarDayPeekProvider,
  CalendarIconButton,
  CalendarTrack,
  CalendarWeekdayRow,
} from './ScheduleCalendarParts'
import {
  describeDay,
  getMonthWeeks,
  useFollowSelectedDate,
  type ScheduleCalendarProps,
} from './scheduleCalendarShared'

const MONTH_INDEXES = Array.from({ length: 12 }, (_, index) => index)

// 选中的那天垫了一块灰底，环上没做的部分要深一档才看得出来。
const SELECTED_TRACK_COLOR = '#d4d4d8'

// 日历方案「环」：没有格子线也没有边框，每天就是一个日期数字，外面套一圈分段的进度环。
//
// - 顶栏：左边是年份，右边一条十二个月的轨道占满剩下的宽度，白片停在当前看的月份上；
//   轨道两端的箭头一次翻一个月，翻过十二月自动进下一年。
// - 格子：有任务的日子画环（一个任务一段），没有任务的日子只有数字。
// - 状态：悬停和选中都只是在环后面垫一块圆形底色，不描边；今天的数字是深色圆底。
// - 鼠标在某天上停一下，浮出这天的任务名。
export function ScheduleRingCalendar({
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarProps) {
  const [month, setMonthStart] = useFollowSelectedDate(selectedDate, startOfMonth)
  const weeks = useMemo(() => getMonthWeeks(month), [month])

  return (
    <CalendarDayPeekProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-[60px] shrink-0 items-center gap-5 pr-3 pl-5">
          <span className="text-[20px] leading-none font-semibold tracking-tight tabular-nums">
            {format(month, 'yyyy')}
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <CalendarIconButton
              aria-label="Previous month"
              onClick={() => setMonthStart((current) => addMonths(current, -1))}
            >
              <ChevronLeft />
            </CalendarIconButton>
            <CalendarTrack
              aria-label="Month"
              className="min-w-0 flex-1"
              value={String(month.getMonth())}
              onValueChange={(next) => setMonthStart(setMonth(month, Number(next)))}
              items={MONTH_INDEXES.map((index) => ({
                value: String(index),
                label: format(setMonth(month, index), 'MMM'),
                emphasized:
                  index === today.getMonth() &&
                  month.getFullYear() === today.getFullYear(),
              }))}
            />
            <CalendarIconButton
              aria-label="Next month"
              onClick={() => setMonthStart((current) => addMonths(current, 1))}
            >
              <ChevronRight />
            </CalendarIconButton>
          </div>
        </div>

        <div
          role="table"
          aria-label={format(month, 'MMMM yyyy')}
          className="flex min-h-0 flex-1 flex-col px-3 pb-3"
        >
          <CalendarWeekdayRow days={weeks[0]} className="h-8" />
          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
            <div
              role="rowgroup"
              className="grid min-h-full"
              style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(66px, 1fr))` }}
            >
              {weeks.map((week) => (
                <div key={dayKey(week[0])} role="row" className="grid grid-cols-7">
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
                            className="group flex min-w-0 flex-1 items-center justify-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                          >
                            {/* 整个格子都能点，但底色只垫在环后面的一块圆上：和环是同一个形状。 */}
                            <span
                              className={cn(
                                'flex size-[62px] items-center justify-center rounded-full transition-colors',
                                selected
                                  ? 'bg-black/[0.07]'
                                  : 'group-hover:bg-black/[0.04]'
                              )}
                            >
                              <span
                                className={cn(
                                  'relative flex size-12 items-center justify-center',
                                  !isSameMonth(day, month) && 'opacity-35'
                                )}
                              >
                                <DayRing
                                  tasks={tasks}
                                  size={48}
                                  trackColor={selected ? SELECTED_TRACK_COLOR : undefined}
                                  className="absolute inset-0"
                                />
                                <CalendarDayNumber
                                  day={day}
                                  isToday={isToday}
                                  // 没有任务的日子，数字退后一档。
                                  className={cn(
                                    tasks.length === 0 &&
                                      !isToday &&
                                      'font-normal text-zinc-500'
                                  )}
                                />
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
