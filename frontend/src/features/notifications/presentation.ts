import { Bell, BellRing, Megaphone } from 'lucide-react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'

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
    body: 'text-amber-900/75',
  },
  notification: {
    label: 'Notification',
    icon: Bell,
    accent: 'text-sky-600',
    shell: 'border-sky-200/70 bg-sky-50/70',
    title: 'text-sky-950',
    body: 'text-sky-900/75',
  },
  system: {
    label: 'System',
    icon: Megaphone,
    accent: 'text-zinc-600',
    shell: 'border-zinc-200/80 bg-zinc-100/70',
    title: 'text-zinc-900',
    body: 'text-zinc-600',
  },
}

/** A type the feed has not been taught to style still renders as something. */
const FALLBACK = PRESENTATION.notification

export function presentationFor(type: string): NotificationPresentation {
  return PRESENTATION[type as NotificationType] ?? FALLBACK
}

/**
 * When it arrived, in as few characters as stay honest: a time for today, a
 * weekday for this week-ish, a date beyond that. The feed's ordering already
 * carries "newest first"; this only has to say which one it is.
 */
export function notificationTimeLabel(iso: string): string {
  const when = parseISO(iso)
  if (Number.isNaN(when.getTime())) {
    return ''
  }
  if (isToday(when)) {
    return format(when, 'HH:mm')
  }
  if (isYesterday(when)) {
    return 'Yesterday'
  }
  return format(when, 'MMM d')
}

/**
 * The item's date, always spelled out — the card's meta line.
 *
 * Unlike the chip (where a cell has ~70px and the day is the cell's own date),
 * the card stands alone, so it has to say WHICH day it belongs to. "08:30" is
 * only readable next to today's date in the column header; "Sep 24, 08:30" is
 * readable anywhere.
 */
export function notificationDateLabel(iso: string): string {
  const when = parseISO(iso)
  return Number.isNaN(when.getTime()) ? '' : format(when, 'MMM d, HH:mm')
}

/** The chip's hover text: the full date plus the whole content. */
export function notificationFullLabel(iso: string): string {
  const when = parseISO(iso)
  return Number.isNaN(when.getTime()) ? '' : format(when, 'MMM d, HH:mm')
}

/** The `yyyy-MM-dd` bucket a notification belongs to — the calendar cell key. */
export function notificationDayKey(iso: string): string {
  const when = parseISO(iso)
  return Number.isNaN(when.getTime()) ? '' : format(when, 'yyyy-MM-dd')
}
