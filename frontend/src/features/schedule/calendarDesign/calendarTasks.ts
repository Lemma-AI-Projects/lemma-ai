import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isAfter,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { dayKey } from '@/features/schedule/getScheduleTasks'

export interface CalendarCourse {
  id: string
  name: string
}

// 日历上的一项任务。
// 产品不记录也不安排学习时长，所以这里没有任何「多少分钟」的字段：
// 日历只表达某天有几件事、各做到哪了。
export interface CalendarTask {
  id: string
  title: string
  courseId: string
  date: Date
  // 这项任务分成几步、已经做完几步。
  steps: { completed: number; total: number }
}

// - done：做完了；
// - started：做了一部分；
// - todo：到今天为止该做、还没开始（过去的日子里就是没做）；
// - planned：排在今天之后，还没到。
export type CalendarTaskStatus = 'done' | 'started' | 'todo' | 'planned'

// 每一种日历方案都拿到同样的东西。
export interface ScheduleCalendarViewProps {
  today: Date
  courses: readonly CalendarCourse[]
  tasksByDay: ReadonlyMap<string, readonly CalendarTask[]>
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

// 周一到周日。
export const CALENDAR_WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

// 0..1
export function calendarTaskProgress(task: CalendarTask): number {
  const { completed, total } = task.steps
  return total > 0 ? Math.min(Math.max(completed / total, 0), 1) : 0
}

export function calendarTaskStatus(task: CalendarTask, today: Date): CalendarTaskStatus {
  const progress = calendarTaskProgress(task)
  if (progress >= 1) return 'done'
  if (progress > 0) return 'started'
  return isAfter(task.date, today) ? 'planned' : 'todo'
}

export function groupCalendarTasksByDay(
  tasks: readonly CalendarTask[]
): Map<string, CalendarTask[]> {
  const groups = new Map<string, CalendarTask[]>()
  for (const task of tasks) {
    const key = dayKey(task.date)
    const group = groups.get(key)
    if (group) group.push(task)
    else groups.set(key, [task])
  }
  return groups
}

// 一个月的格子：从 1 号所在那周的周一开始，一周一行，铺到月底所在的那一周。
// 少则四行，多则六行；前后用邻月的日子补齐。
export function getCalendarMonthWeeks(month: Date): Date[][] {
  const firstDay = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const dayCount = differenceInCalendarDays(endOfMonth(month), firstDay) + 1
  const weekCount = Math.ceil(dayCount / 7)

  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(firstDay, week * 7 + day))
  )
}

// 读屏用的一句话：「11月27日 星期五，3 项任务」。
export function calendarDayLabel(date: Date, taskCount: number): string {
  const label = format(date, 'M月d日 EEEE', { locale: zhCN })
  return taskCount > 0 ? `${label}，${taskCount} 项任务` : label
}
