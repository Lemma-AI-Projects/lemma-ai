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
import { NotificationChip } from '@/features/notifications/NotificationChip'
import type { Notification } from '@/features/notifications/types'
import { ScheduledTaskChip } from '@/features/scheduler/ScheduledTaskChip'
import type { ScheduledTask } from '@/features/scheduler/types'
import { cn } from '@/lib/utils'
import { dayKey } from './scheduleUtils'

/** A month cell is ~70px tall: two items then a count, never a scrollbar. */
const MAX_ITEMS_PER_DAY = 2

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

function groupByDay<T>(items: readonly T[], keyOf: (item: T) => string) {
  const byDay = new Map<string, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    const bucket = byDay.get(key)
    if (bucket) {
      bucket.push(item)
    } else {
      byDay.set(key, [item])
    }
  }
  // Newest first inside a day as well — the order the feed already arrives in.
  // Deliberately NOT reversed into chronological order: a cell renders only the
  // first MAX_ITEMS_PER_DAY, so an oldest-first reading would push the newest
  // item into "+N more" — hiding exactly what the learner just received.
  return byDay
}

/**
 * The month grid — the calendar half of the Feed.
 *
 * It renders whatever it was given as items inside the day they belong to, and
 * it knows two kinds: notifications (things that happened, from the Notification
 * Sender) and scheduled tasks (things that will happen, from the Scheduler).
 * Both arrive as props from `features/notifications` and `features/scheduler`;
 * nothing here fetches, and nothing here decides what either one means.
 *
 * A cell shows the scheduled tasks first: "what is still coming today" belongs
 * above "what already arrived", and it also keeps a pending promise visible
 * instead of trailing behind a few notifications.
 */
export function ScheduleTimeline({
  notifications = [],
  scheduledTasks = [],
  onCancelTask,
}: {
  notifications?: readonly Notification[]
  scheduledTasks?: readonly ScheduledTask[]
  onCancelTask?: (id: string) => void
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const weeks = useMemo(() => getMonthWeeks(month), [month])
  const notificationsByDay = useMemo(
    () => groupByDay(notifications, (item) => dayKey(item.timestamp)),
    [notifications]
  )
  const tasksByDay = useMemo(
    () => groupByDay(scheduledTasks, (item) => dayKey(item.runAt)),
    [scheduledTasks]
  )

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
                  const cellKey = format(day, 'yyyy-MM-dd')
                  const dayTaskItems = (tasksByDay.get(cellKey) ?? []).map(
                    (task) => ({ kind: 'task' as const, task })
                  )
                  const dayNotificationItems = (
                    notificationsByDay.get(cellKey) ?? []
                  ).map((notification) => ({
                    kind: 'notification' as const,
                    notification,
                  }))
                  // Scheduled first: a promise still to be kept reads above
                  // something that already happened, and it is what the learner
                  // can still act on (the × on the chip).
                  const dayItems = [...dayTaskItems, ...dayNotificationItems]
                  const shown = dayItems.slice(0, MAX_ITEMS_PER_DAY)
                  const overflow = dayItems.length - shown.length

                  return (
                    <div
                      key={cellKey}
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
                        dateTime={cellKey}
                        aria-current={today ? 'date' : undefined}
                        className={cn(
                          'ml-auto flex size-5 items-center justify-center rounded-full text-[11px] font-medium leading-4 tabular-nums',
                          today && 'bg-zinc-700 font-semibold text-white'
                        )}
                      >
                        {format(day, 'd')}
                      </time>
                      {shown.length > 0 && (
                        <div className="mt-1 flex flex-col gap-[3px]">
                          {shown.map((item) =>
                            item.kind === 'task' ? (
                              <ScheduledTaskChip
                                key={item.task.id}
                                task={item.task}
                                onCancel={onCancelTask}
                              />
                            ) : (
                              <NotificationChip
                                key={item.notification.id}
                                notification={item.notification}
                              />
                            )
                          )}
                          {overflow > 0 && (
                            <span className="pl-1 text-[10px] leading-4 text-zinc-400">
                              +{overflow} more
                            </span>
                          )}
                        </div>
                      )}
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
