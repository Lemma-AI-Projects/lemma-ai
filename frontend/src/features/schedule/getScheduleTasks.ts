import { addDays, format, isBefore, startOfDay } from 'date-fns'

import { scheduleTasks, type ScheduleTaskTag } from '@/mock/scheduleTasks'

export interface ScheduleTask {
  id: string
  title: string
  description: string
  tags: readonly ScheduleTaskTag[]
  date: Date
  dueDateLabel: string
  minutes: number
  commentCount: number
  progress: { completed: number; total: number }
  /** 0..1 */
  progressRatio: number
  /** 日期已过且没做完 */
  overdue: boolean
}

export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function getScheduleTasks(today: Date): ScheduleTask[] {
  const base = startOfDay(today)
  return scheduleTasks.map((task) => {
    const date = addDays(base, task.dayOffset)
    const { completed, total } = task.progress
    const progressRatio = total > 0 ? Math.min(completed / total, 1) : 0
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      tags: task.tags,
      date,
      dueDateLabel: format(date, 'MMM d'),
      minutes: task.minutes,
      commentCount: task.commentCount,
      progress: task.progress,
      progressRatio,
      overdue: isBefore(date, base) && progressRatio < 1,
    }
  })
}

export function groupTasksByDay(tasks: readonly ScheduleTask[]): Map<string, ScheduleTask[]> {
  const groups = new Map<string, ScheduleTask[]>()
  for (const task of tasks) {
    const key = dayKey(task.date)
    const group = groups.get(key)
    if (group) group.push(task)
    else groups.set(key, [task])
  }
  return groups
}
