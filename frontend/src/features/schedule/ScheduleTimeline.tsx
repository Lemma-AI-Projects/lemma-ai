import { useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

export function ScheduleTimeline() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const weeks = useMemo(() => getMonthWeeks(month), [month])

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

                  return (
                    <div
                      key={format(day, 'yyyy-MM-dd')}
                      role="cell"
                      aria-label={format(day, 'EEEE, MMMM d, yyyy')}
                      className={cn(
                        'min-w-0 rounded-[12px] border p-[6px] transition-[background-color,border-color,box-shadow] duration-200',
                        inMonth
                          ? 'border-zinc-200/60 bg-zinc-100/25 text-zinc-700 hover:border-zinc-300/70 hover:bg-zinc-100/70'
                          : 'border-zinc-200/50 bg-zinc-100/20 text-zinc-400 opacity-45',
                        today && 'border-zinc-300 bg-white shadow-[inset_0_0_0_1.5px_#71717a] hover:border-zinc-300 hover:bg-white'
                      )}
                    >
                      <time
                        dateTime={format(day, 'yyyy-MM-dd')}
                        aria-current={today ? 'date' : undefined}
                        className={cn(
                          'ml-auto flex size-5 items-center justify-center rounded-full text-[11px] font-medium leading-4 tabular-nums',
                          today && 'bg-zinc-700 font-semibold text-white'
                        )}
                      >
                        {format(day, 'd')}
                      </time>
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
