import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, isToday } from 'date-fns'
import { scheduleEvents } from '@/mock/scheduleEvents'
import { CurrentTimeBadge } from './CurrentTimeBadge'
import { CurrentTimeIndicator } from './CurrentTimeIndicator'
import { ScheduleEventCard } from './ScheduleEventCard'
import { TodayTimeMarker } from './TodayTimeMarker'
import { ScheduleWeekHeader } from './ScheduleWeekHeader'
import { getWeekDays, HOUR_HEIGHT, HOURS_24, TIME_LABEL_WIDTH } from './scheduleUtils'

function getCurrentTime() {
  const now = new Date()
  const top = (now.getHours() * 60 + now.getMinutes()) * (HOUR_HEIGHT / 60)
  const label =
    String(now.getHours()).padStart(2, '0') +
    ':' +
    String(now.getMinutes()).padStart(2, '0')
  return { top, label }
}

export function ScheduleTimeline() {
  const days = useMemo(() => getWeekDays(), [])
  const hasToday = useMemo(() => days.some((d) => isToday(d)), [days])
  const [currentTime, setCurrentTime] = useState(getCurrentTime)

  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof scheduleEvents> = {}
    for (const ev of scheduleEvents) {
      ;(map[ev.date] ??= []).push(ev)
    }
    return map
  }, [])
  const gridRef = useRef<HTMLDivElement>(null)

  const scrollToNow = useCallback(() => {
    const el = gridRef.current
    if (!el) return
    el.scrollTop = Math.max(0, currentTime.top - el.clientHeight / 3)
  }, [currentTime.top])

  useEffect(() => {
    scrollToNow()
  }, [scrollToNow])

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(getCurrentTime()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="h-[42px] shrink-0" />

      <ScheduleWeekHeader days={days} />

      <div ref={gridRef} className="scrollbar-hidden flex-1 overflow-y-auto">
        <div className="flex">
          <div className="relative shrink-0 border-r border-border" style={{ width: TIME_LABEL_WIDTH }}>
            {hasToday && <CurrentTimeBadge top={currentTime.top} label={currentTime.label} />}
            {HOURS_24.map((hour) => (
              <div
                key={hour}
                className="relative"
                style={{ height: HOUR_HEIGHT }}
              >
                {hour > 0 && (
                  <span className="absolute left-0 right-0 top-0 -translate-y-1/2 text-center text-xs leading-none text-muted-foreground">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="relative flex min-w-0 flex-1">
            {hasToday && <CurrentTimeIndicator top={currentTime.top} />}
            {days.map((day, colIdx) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayEvents = eventsByDate[dateKey] ?? []
              return (
                <div
                  key={day.toISOString()}
                  className={`relative flex-1 ${colIdx < 6 ? 'border-r border-border' : ''}`}
                >
                  {isToday(day) && <TodayTimeMarker top={currentTime.top} />}
                  {dayEvents.map((ev) => (
                    <ScheduleEventCard key={ev.id} event={ev} />
                  ))}
                  {HOURS_24.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-border"
                      style={{ height: HOUR_HEIGHT }}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
