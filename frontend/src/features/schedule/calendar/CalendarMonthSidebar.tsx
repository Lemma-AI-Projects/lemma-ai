import { format, isSameMonth, setMonth as withMonthIndex } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { CircularProgress } from '@/components/CircularProgress'
import { cn } from '@/lib/utils'
import { CalendarIconButton } from './ScheduleCalendarParts'
import { monthKey, tallyPercent, type TaskTally } from './scheduleCalendarShared'

// 月历左边的月份栏，从上到下：年份；这一年的十二个月；翻月和回到今天。
//
// - 点哪个月就看哪个月。每个月后面的小圆环是那个月做完了多少，没有安排的月份不画。
// - 最下面的箭头一次翻一个月，翻过十二月自动进下一年，上面的年份跟着变。
//   没有「一次跳一年」的按钮：跨度太大，几乎用不上。
export function CalendarMonthSidebar({
  month,
  onMonthSelect,
  onMonthStep,
  onToday,
  summaries,
  today,
}: {
  month: Date
  onMonthSelect: (month: Date) => void
  // 往前（-1）或往后（1）翻一个月。
  onMonthStep: (delta: number) => void
  onToday: () => void
  summaries: ReadonlyMap<string, TaskTally>
  today: Date
}) {
  return (
    <div className="flex w-[116px] shrink-0 flex-col">
      <div className="flex h-8 shrink-0 items-center pl-2.5 text-[15px] font-semibold tabular-nums">
        {format(month, 'yyyy')}
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
              onClick={() => onMonthSelect(item)}
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

      <div className="mt-auto flex shrink-0 items-center gap-0.5 pt-2 pb-1">
        <CalendarIconButton aria-label="Previous month" onClick={() => onMonthStep(-1)}>
          <ChevronLeft />
        </CalendarIconButton>
        <button
          type="button"
          onClick={onToday}
          className="inline-flex h-7 min-w-0 flex-1 items-center justify-center rounded-full text-[13px] leading-none text-zinc-800 ring-1 ring-zinc-300 outline-none transition-colors ring-inset hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Today
        </button>
        <CalendarIconButton aria-label="Next month" onClick={() => onMonthStep(1)}>
          <ChevronRight />
        </CalendarIconButton>
      </div>
    </div>
  )
}
