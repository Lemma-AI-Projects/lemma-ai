import type { ScheduleEvent } from '@/mock/scheduleEvents'
import { getEventHeight, getEventTop } from './scheduleUtils'

const colorMap: Record<string, string> = {
  blue:    'bg-blue-500',
  violet:  'bg-violet-500',
  amber:   'bg-amber-500',
  sky:     'bg-sky-500',
  emerald: 'bg-emerald-500',
  orange:  'bg-orange-500',
  rose:    'bg-rose-500',
  cyan:    'bg-cyan-500',
  fuchsia: 'bg-fuchsia-500',
}

function parseDuration(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

interface ScheduleEventCardProps {
  event: ScheduleEvent
}

export function ScheduleEventCard({ event }: ScheduleEventCardProps) {
  const top = getEventTop(event.startTime)
  const height = getEventHeight(event.startTime, event.endTime)
  const duration = parseDuration(event.startTime, event.endTime)
  const bg = colorMap[event.color] ?? colorMap.blue
  const timeLabel = `${event.startTime} – ${event.endTime}`

  if (duration < 30) {
    return (
      <div
        className={`absolute left-1 right-1 flex items-center gap-1 overflow-hidden rounded-md px-1.5 text-white ${bg}`}
        style={{ top, height: Math.max(height, 20) }}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-white/70" />
        <span className="truncate text-[10px] font-medium">{event.title}</span>
        <span className="ml-auto shrink-0 text-[10px] text-white/70">{event.startTime}</span>
      </div>
    )
  }

  if (duration <= 60) {
    return (
      <div
        className={`absolute left-1 right-1 overflow-hidden rounded-md p-1.5 text-white ${bg}`}
        style={{ top, height }}
      >
        <div className="flex items-center gap-1">
          <span className="size-1.5 shrink-0 rounded-full bg-white/70" />
          <span className="truncate text-xs font-medium">{event.title}</span>
        </div>
        <p className="mt-0.5 truncate pl-2.5 text-[10px] text-white/70">{timeLabel}</p>
      </div>
    )
  }

  return (
    <div
      className={`absolute left-1 right-1 overflow-hidden rounded-md p-1.5 text-white ${bg}`}
      style={{ top, height }}
    >
      <div className="flex items-start gap-1">
        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-white/70" />
        <span className="break-words text-xs font-medium">{event.title}</span>
      </div>
      <p className="mt-0.5 pl-2.5 text-[10px] text-white/70">{timeLabel}</p>
    </div>
  )
}
