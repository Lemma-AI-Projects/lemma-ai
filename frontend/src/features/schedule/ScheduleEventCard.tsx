import type { ScheduleEvent } from '@/mock/scheduleEvents'
import { getEventHeight, getEventTop } from './scheduleUtils'

const colorMap: Record<string, { bg: string; border: string; dot: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  dot: 'bg-violet-500' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  sky:     { bg: 'bg-sky-50',     border: 'border-sky-200',     dot: 'bg-sky-500' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  dot: 'bg-orange-500' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    dot: 'bg-rose-500' },
  cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',    dot: 'bg-cyan-500' },
  fuchsia: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', dot: 'bg-fuchsia-500' },
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
  const c = colorMap[event.color] ?? colorMap.blue
  const timeLabel = `${event.startTime} – ${event.endTime}`

  if (duration < 30) {
    return (
      <div
        className={`absolute left-1 right-1 flex items-center gap-1 overflow-hidden rounded-md border px-1.5 ${c.bg} ${c.border}`}
        style={{ top, height: Math.max(height, 20) }}
      >
        <span className={`size-1.5 shrink-0 rounded-full ${c.dot}`} />
        <span className="truncate text-[10px] font-medium">{event.title}</span>
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{event.startTime}</span>
      </div>
    )
  }

  if (duration <= 60) {
    return (
      <div
        className={`absolute left-1 right-1 overflow-hidden rounded-md border p-1.5 ${c.bg} ${c.border}`}
        style={{ top, height }}
      >
        <div className="flex items-center gap-1">
          <span className={`size-1.5 shrink-0 rounded-full ${c.dot}`} />
          <span className="truncate text-xs font-medium">{event.title}</span>
        </div>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{timeLabel}</p>
      </div>
    )
  }

  return (
    <div
      className={`absolute left-1 right-1 overflow-hidden rounded-md border p-1.5 ${c.bg} ${c.border}`}
      style={{ top, height }}
    >
      <div className="flex items-center gap-1">
        <span className={`size-1.5 shrink-0 rounded-full ${c.dot}`} />
        <span className="truncate text-xs font-medium">{event.title}</span>
      </div>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{timeLabel}</p>
    </div>
  )
}
