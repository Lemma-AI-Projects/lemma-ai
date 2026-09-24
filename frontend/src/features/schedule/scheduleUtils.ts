import { addDays, format, parseISO, startOfWeek } from 'date-fns'

export const HOUR_HEIGHT = 80
export const TIME_LABEL_WIDTH = 65
export const HOURS_24 = Array.from({ length: 24 }, (_, i) => i)

/**
 * Which day an item belongs to, in the month grid's own terms.
 *
 * The one implementation both feed item types use — a notification and a
 * scheduled task have to land in the same cell for the same timestamp, and two
 * copies of "which day is this" is exactly how they would drift apart. Local
 * time on purpose: the cell the learner sees is a local day.
 */
export function dayKey(iso: string): string {
  const when = parseISO(iso)
  return Number.isNaN(when.getTime()) ? '' : format(when, 'yyyy-MM-dd')
}

export function getWeekDays(referenceDate: Date = new Date()) {
  const monday = startOfWeek(referenceDate, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function getEventTop(startTime: string): number {
  return parseTime(startTime) * (HOUR_HEIGHT / 60)
}

export function getEventHeight(startTime: string, endTime: string): number {
  return (parseTime(endTime) - parseTime(startTime)) * (HOUR_HEIGHT / 60)
}
