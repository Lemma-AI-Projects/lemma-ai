import { cn } from '@/lib/utils'
import { notificationTimeLabel, presentationFor } from './presentation'
import type { Notification } from './types'

/**
 * A notification as a card in the Today column of the Schedule page.
 *
 * It reuses the task cards' skeleton on purpose — same radius, same padding
 * rhythm, same title/body/meta stack — so it reads as one of the feed's card
 * types rather than an intruder. What makes it recognisably NOT a task is the
 * warm tint, the bell, and the fact that it carries a time instead of progress:
 * a reminder has nothing to complete.
 *
 * Read-only by design. V0 has no dismiss, no snooze, no "open": every one of
 * those is a decision about what a notification means, and meaning lives in the
 * Scheduler that does not exist yet.
 */
export function NotificationCard({ notification }: { notification: Notification }) {
  const look = presentationFor(notification.type)
  const Icon = look.icon

  return (
    <div
      data-notification-id={notification.id}
      data-notification-type={notification.type}
      className={cn('rounded-lg border px-3 py-2.5', look.shell)}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn('size-3.5 shrink-0', look.accent)} />
        <span
          className={cn(
            'text-[10px] font-medium uppercase tracking-[0.06em]',
            look.accent
          )}
        >
          {look.label}
        </span>
        <time
          dateTime={notification.timestamp}
          className="ml-auto shrink-0 text-[10px] tabular-nums text-zinc-500"
        >
          {notificationTimeLabel(notification.timestamp)}
        </time>
      </div>
      <p className={cn('mt-1.5 text-sm font-medium leading-snug', look.title)}>
        {notification.title}
      </p>
      {notification.body && (
        <p className={cn('mt-1 text-xs leading-relaxed', look.body)}>
          {notification.body}
        </p>
      )}
    </div>
  )
}
