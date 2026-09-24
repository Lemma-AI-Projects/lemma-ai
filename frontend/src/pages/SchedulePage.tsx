import { format } from 'date-fns'
import { AlarmClock, BellRing, CircleCheckBig, Ellipsis, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CircularProgress } from '@/components/CircularProgress'
import { NotificationCard } from '@/features/notifications/NotificationCard'
import { SendTestNotificationButton } from '@/features/notifications/SendTestNotificationButton'
import { useNotificationsQuery } from '@/features/notifications/notificationApi'
import { ScheduleTestButton } from '@/features/scheduler/ScheduleTestButton'
import {
  useCancelScheduledTask,
  useScheduledTasksQuery,
} from '@/features/scheduler/schedulerApi'
import { ScheduleTimeline } from '@/features/schedule/ScheduleTimeline'
import { dayKey } from '@/features/schedule/scheduleUtils'
import { TaskCard } from '@/features/schedule/TaskCard'
import { tasks } from '@/mock/scheduleTasks'

const overallDone = tasks.reduce((sum, t) => sum + t.progress.completed, 0)
const overallTotal = tasks.reduce((sum, t) => sum + t.progress.total, 0)
const overallPercent = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0

/**
 * Schedule — the Feed: today's items on the left, the month on the right.
 *
 * Two producers write into this page and it treats them the same way:
 *
 *   - the Notification Sender (`features/notifications`) puts items in the Feed
 *     the moment they are sent;
 *   - the Scheduler (`features/scheduler`) puts *promises* there — a pending task
 *     shows in the cell of its `runAt`, and when the API's clock fires it the
 *     promise turns into a notification, which shows up through the feed's own
 *     read.
 *
 * The page owns neither: both are react-query reads, and both are refreshed on an
 * interval because V0 has no push channel for in-app items (see the poll note in
 * `schedulerApi.ts`). Without that, waiting for a scheduled reminder would mean
 * hitting refresh — which is exactly what the acceptance test is not supposed to
 * need.
 */
export function SchedulePage() {
  const { data: notifications = [] } = useNotificationsQuery()
  const { data: scheduledTasks = [] } = useScheduledTasksQuery()
  const cancelTask = useCancelScheduledTask()

  // The Today column shows today's items — the list is a "today" list, and older
  // notifications are still on the calendar, in the cell of their own date.
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const todaysNotifications = notifications.filter(
    (notification) => dayKey(notification.timestamp) === todayKey
  )
  // Pending only: what is still going to happen. An executed task is history, and
  // its outcome is already visible in the Feed as the notification it produced.
  const pendingTasks = scheduledTasks.filter((task) => task.status === 'pending')
  const todaysTasks = pendingTasks.filter((task) => dayKey(task.runAt) === todayKey)

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
        {/* Dev-only: exercise the Notification Sender and the Scheduler without
            waiting for a Global Agent. Deleted with the V0 scaffolding. */}
        {import.meta.env.DEV && (
          <div className="mt-2 flex flex-col gap-2">
            <SendTestNotificationButton />
            <ScheduleTestButton />
          </div>
        )}
        <div className="scrollbar-hidden mt-2 flex flex-1 flex-col gap-3 overflow-y-auto">
          {todaysTasks.length > 0 && (
            <section
              aria-label="Scheduled today"
              className="flex flex-col gap-2 border-b border-dashed border-zinc-200 pb-3"
            >
              <div className="flex items-center gap-1.5 px-0.5">
                <AlarmClock className="size-3.5 text-violet-600" />
                <span className="text-xs font-semibold text-zinc-700">
                  Scheduled today
                </span>
                <span className="text-[10px] font-medium tabular-nums text-zinc-500">
                  {todaysTasks.length}
                </span>
              </div>
              {todaysTasks.map((task) => (
                // One line, not a full card: a promise has no body worth reading
                // yet, and the × is the only thing you can do with it.
                <div
                  key={task.id}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50/70 px-3 py-2"
                >
                  <AlarmClock className="size-3.5 shrink-0 text-violet-600" />
                  <time
                    dateTime={task.runAt}
                    className="shrink-0 text-xs font-semibold tabular-nums text-violet-700"
                  >
                    {format(new Date(task.runAt), 'HH:mm')}
                  </time>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-800">
                    {task.payload.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Cancel ${task.payload.title}`}
                    onClick={() => cancelTask.mutate(task.id)}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </section>
          )}
          {todaysNotifications.length > 0 && (
            <section
              aria-label="Reminders"
              className="flex flex-col gap-2 border-b border-dashed border-zinc-200 pb-3"
            >
              <div className="flex items-center gap-1.5 px-0.5">
                <BellRing className="size-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-zinc-700">
                  Reminders
                </span>
                <span className="text-[10px] font-medium tabular-nums text-zinc-500">
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
        <ScheduleTimeline
          notifications={notifications}
          scheduledTasks={pendingTasks}
          onCancelTask={(id) => cancelTask.mutate(id)}
        />
      </div>
    </div>
  )
}
