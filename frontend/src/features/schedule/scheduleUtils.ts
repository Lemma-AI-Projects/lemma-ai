import { addDays, startOfWeek } from 'date-fns'

export const HOUR_HEIGHT = 80
export const TIME_LABEL_WIDTH = 65
export const HOURS_24 = Array.from({ length: 24 }, (_, i) => i)

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
