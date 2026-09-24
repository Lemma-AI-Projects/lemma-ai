import { cn } from '@/lib/utils'
import { notificationTimeLabel, presentationFor } from './presentation'
import type { Notification } from './types'

/**
 * A notification as a chip inside a calendar day cell.
 *
 * This is the "it was always part of the Calendar" half of the feature: the item
 * sits in the day it belongs to, under the date, exactly where a scheduled event
 * would. It is intentionally small — a month cell is ~70px of usable height — so
 * it shows the icon and a truncated title, and the full text lives in the card in
 * the Today column.
 *
 * It is display-only, like the events around it: the chip is not a link and does
 * not open a panel, because a notification with no destination would need an
 * invented one. `title` attributes carry the full text on hover.
 */
export function NotificationChip({ notification }: { notification: Notification }) {
  const look = presentationFor(notification.type)
  const Icon = look.icon
  const full = [notification.title, notification.body].filter(Boolean).join(' — ')

  return (
    <div
      data-notification-id={notification.id}
      data-notification-type={notification.type}
      title={`${notificationTimeLabel(notification.timestamp)} · ${full}`}
      className={cn(
        'flex select-none items-center gap-1 rounded-[6px] border px-1 py-[2px]',
        look.shell
      )}
    >
      <Icon className={cn('size-2.5 shrink-0', look.accent)} />
      <span className="min-w-0 flex-1 truncate text-[10px] leading-4 text-zinc-700">
        {notification.title}
      </span>
    </div>
  )
}
