import { useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DayTaskLanes } from './DayTaskLanes'
import { dayKey, type ScheduleTask } from './getScheduleTasks'

function getMonthWeeks(month: Date) {
  const firstDay = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const daysThroughMonthEnd =
    differenceInCalendarDays(endOfMonth(month), firstDay) + 1
  // Keep five rows by default; a sixth row prevents long months losing dates.
  const weekCount = Math.max(5, Math.ceil(daysThroughMonthEnd / 7))

  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(firstDay, week * 7 + day))
  )
}

export function ScheduleTimeline({
  tasksByDay,
  selectedDate,
  onSelectDate,
}: {
  tasksByDay: ReadonlyMap<string, readonly ScheduleTask[]>
  selectedDate: Date
  onSelectDate: (date: Date) => void
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const weeks = useMemo(() => getMonthWeeks(month), [month])
  const todayStart = startOfDay(new Date())

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-[60px] shrink-0 items-center justify-end px-4">
        <div className="flex h-full items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full bg-transparent"
            onClick={() => setMonth((current) => subMonths(current, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-[18px]" />
          </Button>
          <span className="flex h-full min-w-[124px] items-center justify-center text-center text-[18px] font-semibold leading-none">
            {format(month, 'MMMM yyyy')}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full bg-transparent"
            onClick={() => setMonth((current) => addMonths(current, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-[18px]" />
          </Button>
        </div>
      </div>

      <div
        role="table"
        aria-label={format(month, 'MMMM yyyy')}
        className="flex min-h-0 flex-1 flex-col px-4 pb-3"
      >
        <div role="row" className="mb-1.5 grid h-[27px] shrink-0 grid-cols-7 gap-[5px]">
          {weeks[0].map((day) => (
            <div
              key={day.getDay()}
              role="columnheader"
              className="flex items-center justify-center text-xs font-medium leading-4 tracking-[0.04em] text-zinc-500"
            >
              {format(day, 'EEE')}
            </div>
          ))}
        </div>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
          <div
            role="rowgroup"
            className="grid min-h-full gap-[5px]"
            style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(88px, 1fr))` }}
          >
            {weeks.map((week) => (
              <div
                key={format(week[0], 'yyyy-MM-dd')}
                role="row"
                className="grid grid-cols-7 gap-[5px]"
              >
                {week.map((day) => {
                  const today = isToday(day)
                  const inMonth = isSameMonth(day, month)
                  const selected = isSameDay(day, selectedDate)
                  const tasks = tasksByDay.get(dayKey(day)) ?? []

                  return (
                    <div key={dayKey(day)} role="cell" className="flex min-w-0">
                      <button
                        type="button"
                        aria-label={`${format(day, 'EEEE, MMMM d, yyyy')}${
                          tasks.length > 0 ? `, ${tasks.length} tasks` : ''
                        }`}
                        aria-pressed={selected}
                        onClick={() => onSelectDate(day)}
                        className={cn(
                          'flex min-w-0 flex-1 flex-col rounded-[12px] border p-[6px] text-left outline-none transition-[background-color,border-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-zinc-300',
                          inMonth
                            ? 'border-zinc-200/60 bg-zinc-100/25 text-zinc-700 hover:border-zinc-300/70 hover:bg-zinc-100/70'
                            : 'border-zinc-200/50 bg-zinc-100/20 text-zinc-400 opacity-45',
                          selected && !today && 'border-zinc-400 bg-white hover:border-zinc-400 hover:bg-white',
                          today && 'border-zinc-300 bg-white shadow-[inset_0_0_0_1.5px_#71717a] hover:border-zinc-300 hover:bg-white'
                        )}
                      >
                        <time
                          dateTime={dayKey(day)}
                          aria-current={today ? 'date' : undefined}
                          className={cn(
                            'ml-auto flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] font-medium leading-none tabular-nums',
                            today && 'bg-zinc-700 font-semibold text-white'
                          )}
                        >
                          {format(day, 'd')}
                        </time>
                        <div className="min-h-1 flex-1" />
                        <DayTaskLanes tasks={tasks} isFuture={isAfter(day, todayStart)} />
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
