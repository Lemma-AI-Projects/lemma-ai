import { format, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { TIME_LABEL_WIDTH } from './scheduleUtils'

interface ScheduleWeekHeaderProps {
  days: Date[]
}

export function ScheduleWeekHeader({ days }: ScheduleWeekHeaderProps) {
  return (
    <div className="flex border-b border-t border-border">
      <div className="shrink-0 border-r border-border" style={{ width: TIME_LABEL_WIDTH }} />
      {days.map((day) => {
        const today = isToday(day)
        return (
          <div
            key={day.toISOString()}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 border-r border-border py-2 text-xs last:border-r-0',
              today ? 'font-semibold text-foreground' : 'text-muted-foreground'
            )}
          >
            <span>{format(day, 'EEE')}</span>
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full',
                today && 'bg-zinc-900 text-white'
              )}
            >
              {format(day, 'd')}
            </span>
          </div>
        )
      })}
    </div>
  )
}
