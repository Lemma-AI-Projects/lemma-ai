import { Bell, BellRing, Megaphone } from 'lucide-react'
import { format, parseISO } from 'date-fns'

import type { NotificationType } from './types'

/**
 * How a notification looks in the Feed — one place, so the calendar chip and the
 * card cannot drift apart.
 *
 * The palette is warm (amber) for a reminder: it has to read as "the system
 * noticed something" and stay clearly distinct from a study task, which the
 * Schedule page renders in neutral greys and blues. The classes are written out
 * in full because Tailwind only ships the strings it can see.
 */
interface NotificationPresentation {
  label: string
  icon: typeof Bell
  accent: string
  shell: string
  title: string
  body: string
}

const PRESENTATION: Record<NotificationType, NotificationPresentation> = {
  reminder: {
    label: 'Reminder',
    icon: BellRing,
    accent: 'text-amber-600',
    shell: 'border-amber-200/70 bg-amber-50/70',
    title: 'text-amber-950',
    body: 'text-amber-900/85',
  },
  notification: {
    label: 'Notification',
    icon: Bell,
    accent: 'text-sky-600',
    shell: 'border-sky-200/70 bg-sky-50/70',
    title: 'text-sky-950',
    body: 'text-sky-900/85',
  },
  system: {
    label: 'System',
    icon: Megaphone,
    accent: 'text-zinc-600',
    shell: 'border-zinc-200/80 bg-zinc-100/70',
    title: 'text-zinc-900',
    body: 'text-zinc-700',
  },
}

/** A type the feed has not been taught to style still renders as something. */
const FALLBACK = PRESENTATION.notification

export function presentationFor(type: string): NotificationPresentation {
  return PRESENTATION[type as NotificationType] ?? FALLBACK
}

/**
 * When it arrived, always spelled out — the card's meta line and the chip's
 * hover text.
 *
 * The card stands alone in the column, so it has to say WHICH day the item
 * belongs to; "08:30" is only readable next to today's date in the header, while
 * "Sep 24, 08:30" is readable anywhere (and matches the due-date chips on the
 * task cards right below it). The chip can be terser on screen — its cell IS the
 * date — so it keeps the full stamp in its `title` only.
 */
export function notificationDateLabel(iso: string): string {
  const when = parseISO(iso)
  return Number.isNaN(when.getTime()) ? '' : format(when, 'MMM d, HH:mm')
}
