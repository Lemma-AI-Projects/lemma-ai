import { cn } from '@/lib/utils'
import { notificationDateLabel, presentationFor } from './presentation'
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
 * The date is the cell's own, so the chip does not print it; it stays in the
 * hover text (`Sep 24, 08:30 · title — body`) for when the cell is on a
 * neighbouring month and the day number is all you can see.
 *
 * It is display-only, like the events around it: the chip is not a link and does
 * not open a panel, because a notification with no destination would need an
 * invented one.
 */
export function NotificationChip({ notification }: { notification: Notification }) {
  const look = presentationFor(notification.type)
  const Icon = look.icon
  const full = [notification.title, notification.body].filter(Boolean).join(' — ')
  const date = notificationDateLabel(notification.timestamp)

  return (
    <div
      data-notification-id={notification.id}
      data-notification-type={notification.type}
      title={date ? `${date} · ${full}` : full}
      className={cn(
        'flex select-none items-center gap-1 rounded-[6px] border px-1 py-[3px]',
        look.shell
      )}
    >
      <Icon className={cn('size-2.5 shrink-0', look.accent)} />
      <span className="min-w-0 flex-1 truncate text-[10px] font-medium leading-4 text-zinc-800">
        {notification.title}
      </span>
    </div>
  )
}
