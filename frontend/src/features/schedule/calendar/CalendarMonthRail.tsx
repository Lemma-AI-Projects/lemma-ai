import { addYears, format, isSameMonth, setMonth as withMonthIndex } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { CircularProgress } from '@/components/CircularProgress'
import { cn } from '@/lib/utils'
import { CalendarIconButton } from './ScheduleCalendarParts'
import { monthKey, tallyPercent, type TaskTally } from './scheduleCalendarShared'

// 左边的月份栏：最上面是年份，下面是这一年的十二个月，最下面是回到今天。
// 每个月后面的小圆环是那个月做完了多少；没有安排的月份不画。
export function CalendarMonthRail({
  month,
  onBackToToday,
  onMonthChange,
  summaries,
  today,
}: {
  month: Date
  onBackToToday: () => void
  onMonthChange: (month: Date) => void
  summaries: ReadonlyMap<string, TaskTally>
  today: Date
}) {
  return (
    <div className="flex w-[104px] shrink-0 flex-col">
      <div className="flex h-8 shrink-0 items-center justify-between pl-2.5">
        <span className="text-[15px] font-semibold tabular-nums">
          {format(month, 'yyyy')}
        </span>
        <div className="flex items-center">
          <CalendarIconButton
            aria-label="Previous year"
            className="size-6 [&_svg]:size-4"
            onClick={() => onMonthChange(addYears(month, -1))}
          >
            <ChevronLeft />
          </CalendarIconButton>
          <CalendarIconButton
            aria-label="Next year"
            className="size-6 [&_svg]:size-4"
            onClick={() => onMonthChange(addYears(month, 1))}
          >
            <ChevronRight />
          </CalendarIconButton>
        </div>
      </div>

      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label="Month"
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
                'flex h-8 shrink-0 items-center rounded-sm px-2.5 text-[14px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-inset',
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
              <span className="flex-1 text-left">{format(item, 'MMM')}</span>
              {summary && (
                <CircularProgress
                  value={tallyPercent(summary)}
                  size={14}
                  strokeWidth={2.5}
                  trackColor="#d4d4d8"
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-auto flex shrink-0 px-1 pt-2 pb-1">
        <button
          type="button"
          onClick={onBackToToday}
          className="inline-flex h-7 w-full items-center justify-center rounded-full text-[13px] leading-none text-zinc-800 ring-1 ring-zinc-300 outline-none transition-colors ring-inset hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Today
        </button>
      </div>
    </div>
  )
}
