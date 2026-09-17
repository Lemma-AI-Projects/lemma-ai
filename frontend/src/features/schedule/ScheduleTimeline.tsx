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
      <div className="flex h-[42px] shrink-0 items-center justify-end px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-6 rounded-full bg-transparent"
            onClick={() => setMonth((current) => subMonths(current, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[100px] text-center text-[16px] font-semibold">
            {format(month, 'MMMM yyyy')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 rounded-full bg-transparent"
            onClick={() => setMonth((current) => addMonths(current, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div
        role="table"
        aria-label={format(month, 'MMMM yyyy')}
        className="flex min-h-0 flex-1 flex-col px-3 pb-3"
      >
        <div role="row" className="grid h-9 shrink-0 grid-cols-7 gap-1.5">
          {weeks[0].map((day) => (
            <div
              key={day.getDay()}
              role="columnheader"
              className="flex items-center justify-center text-xs text-muted-foreground"
            >
              {format(day, 'EEE')}
            </div>
          ))}
        </div>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
          <div
            role="rowgroup"
            className="grid min-h-full gap-1.5"
            style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(88px, 1fr))` }}
          >
            {weeks.map((week) => (
              <div
                key={format(week[0], 'yyyy-MM-dd')}
                role="row"
                className="grid grid-cols-7 gap-1.5"
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
                        'min-w-0 rounded-xl border p-2',
                        inMonth
                          ? 'border-zinc-200/80 bg-white/50 text-zinc-600'
                          : 'border-zinc-200/50 text-zinc-300',
                        today && 'border-zinc-400 bg-white'
                      )}
                    >
                      <time
                        dateTime={format(day, 'yyyy-MM-dd')}
                        aria-current={today ? 'date' : undefined}
                        className={cn(
                          'ml-auto flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                          today && 'bg-zinc-900 font-medium text-white'
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
