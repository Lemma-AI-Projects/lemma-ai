import { format } from 'date-fns'
import { BellRing, CircleCheckBig, Ellipsis, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CircularProgress } from '@/components/CircularProgress'
import { NotificationCard } from '@/features/notifications/NotificationCard'
import { SendTestNotificationButton } from '@/features/notifications/SendTestNotificationButton'
import { useNotificationsQuery } from '@/features/notifications/notificationApi'
import { notificationDayKey } from '@/features/notifications/presentation'
import { ScheduleTimeline } from '@/features/schedule/ScheduleTimeline'
import { TaskCard } from '@/features/schedule/TaskCard'
import { tasks } from '@/mock/scheduleTasks'

const overallDone = tasks.reduce((sum, t) => sum + t.progress.completed, 0)
const overallTotal = tasks.reduce((sum, t) => sum + t.progress.total, 0)
const overallPercent = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0

/**
 * Schedule — the Feed: today's items on the left, the month on the right.
 *
 * Notifications arrive here from the Notification Sender (see
 * `features/notifications`) and appear twice, because the page has two ways of
 * showing "what belongs to today":
 *
 *   - as cards in the Today column, above the tasks — the readable form, with the
 *     full body text. This is the only place their content is fully visible.
 *   - as chips in the month cell of their date, which is what makes them feel
 *     like part of the Calendar rather than a panel bolted onto it.
 *
 * The page owns no notification state: `useNotificationsQuery` is the feed's read
 * and the sender's write invalidates it, so a new item shows up without anything
 * here knowing a send happened.
 */
export function SchedulePage() {
  const { data: notifications = [] } = useNotificationsQuery()

  // The Today column shows today's items — the list is a "today" list, and older
  // notifications are still on the calendar, in the cell of their own date.
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const todaysNotifications = notifications.filter(
    (notification) => notificationDayKey(notification.timestamp) === todayKey
  )

  return (
    <div className="flex h-full gap-2">
      <div className="flex w-82 shrink-0 flex-col rounded-md border border-zinc-200/80 bg-zinc-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {overallDone === overallTotal && overallTotal > 0 ? (
              <CircleCheckBig className="size-4 text-green-500" />
            ) : (
              <CircularProgress value={overallPercent} size={14} strokeWidth={2} />
            )}
            <span className="text-sm font-medium">Today</span>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon-xs" aria-label="Add task">
              <Plus className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="More options">
              <Ellipsis className="size-4" />
            </Button>
          </div>
        </div>
        {/* Dev-only: send yourself a notification without waiting for a
            Scheduler. Deleted along with the sender's V0 scaffolding. */}
        {import.meta.env.DEV && <SendTestNotificationButton />}
        <div className="scrollbar-hidden mt-2 flex flex-1 flex-col gap-3 overflow-y-auto">
          {todaysNotifications.length > 0 && (
            <section
              aria-label="Reminders"
              className="flex flex-col gap-2 border-b border-dashed border-zinc-200 pb-3"
            >
              <div className="flex items-center gap-1.5 px-0.5">
                <BellRing className="size-3.5 text-amber-600" />
                <span className="text-xs font-medium text-zinc-600">
                  Reminders
                </span>
                <span className="text-[10px] tabular-nums text-zinc-400">
                  {todaysNotifications.length}
                </span>
              </div>
              {todaysNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </section>
          )}
          {tasks.map((task) => (
            <TaskCard key={task.title} {...task} />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-50">
        <ScheduleTimeline notifications={notifications} />
      </div>
    </div>
  )
}
