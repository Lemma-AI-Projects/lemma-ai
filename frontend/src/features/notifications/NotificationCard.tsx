import { Calendar } from 'lucide-react'

import { cn } from '@/lib/utils'
import { notificationDateLabel, presentationFor } from './presentation'
import type { Notification } from './types'

/**
 * A notification as a card in the Today column of the Schedule page.
 *
 * It borrows the task cards' anatomy deliberately — same radius and padding
 * rhythm, and a bordered date chip in the meta position, exactly like the
 * "Mar 15" chip on a task — so it reads as one of the feed's card types rather
 * than an intruder. What marks it as NOT a task is the warm tint, the bell, and
 * the fact that it has nothing to complete.
 *
 * Type is a notch heavier than the tasks around it (semibold title, medium body)
 * because a notification is the one item in this column the learner did not
 * choose: the column should stop at it, not let it blend into the list.
 *
 * Read-only by design. V0 has no dismiss, no snooze, no "open": every one of
 * those is a decision about what a notification means, and meaning lives in the
 * Scheduler that does not exist yet.
 */
export function NotificationCard({ notification }: { notification: Notification }) {
  const look = presentationFor(notification.type)
  const Icon = look.icon
  const date = notificationDateLabel(notification.timestamp)

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
            'text-[10px] font-semibold uppercase tracking-[0.06em]',
            look.accent
          )}
        >
          {look.label}
        </span>
        {date && (
          // The same meta chip a task card carries, so the two card types line
          // up on the same rhythm — and the item always states its own date.
          <span className="ml-auto flex shrink-0 items-center gap-1 rounded-sm border border-zinc-300/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-zinc-600">
            <Calendar className="size-3" />
            <time dateTime={notification.timestamp}>{date}</time>
          </span>
        )}
      </div>
      <p className={cn('mt-1.5 text-sm font-semibold leading-snug', look.title)}>
        {notification.title}
      </p>
      {notification.body && (
        <p className={cn('mt-1 text-xs font-medium leading-relaxed', look.body)}>
          {notification.body}
        </p>
      )}
    </div>
  )
}
