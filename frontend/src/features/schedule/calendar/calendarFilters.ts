import { useMemo, useState } from 'react'

import type { ScheduleTask } from '../getScheduleTasks'
import { getTaskStatus } from './scheduleCalendarShared'

// 按做完没有筛：全部、还没做完的（包括做了一半的）、做完的。
export type TaskStatusFilter = 'all' | 'todo' | 'done'

// 顶栏里的两个筛选：哪门课、做完没有。
export interface CalendarFilters {
  // 日历现在按什么筛。菜单开着、鼠标停在某一项上时是那一项（先看看效果），否则是选定的。
  // `course` 是课程的 id，null 是全部课程。
  course: string | null
  status: TaskStatusFilter
  // 选定的那一项，也就是胶囊上写的。
  selectedCourse: string | null
  selectedStatus: TaskStatusFilter
  selectCourse: (course: string | null) => void
  selectStatus: (status: TaskStatusFilter) => void
  // 先看看某一项的效果；传 undefined 结束预览。
  previewCourse: (course: string | null | undefined) => void
  previewStatus: (status: TaskStatusFilter | undefined) => void
}

export function useCalendarFilters(): CalendarFilters {
  const [selectedCourse, selectCourse] = useState<string | null>(null)
  const [selectedStatus, selectStatus] = useState<TaskStatusFilter>('all')
  const [coursePreview, previewCourse] = useState<string | null | undefined>(undefined)
  const [statusPreview, previewStatus] = useState<TaskStatusFilter | undefined>(undefined)

  return {
    course: coursePreview === undefined ? selectedCourse : coursePreview,
    status: statusPreview ?? selectedStatus,
    selectedCourse,
    selectedStatus,
    selectCourse,
    selectStatus,
    previewCourse,
    previewStatus,
  }
}

// 没有任务的日子共用这一个空数组，不用每次新建。
export const NO_TASKS: readonly ScheduleTask[] = []

function matchesStatus(task: ScheduleTask, status: TaskStatusFilter): boolean {
  return status === 'all' || (getTaskStatus(task) === 'done') === (status === 'done')
}

// 每天只留符合筛选的任务；一个都不剩的日子不在结果里。什么都没筛时原样返回。
export function filterTasksByDay(
  tasksByDay: ReadonlyMap<string, readonly ScheduleTask[]>,
  course: string | null,
  status: TaskStatusFilter
): ReadonlyMap<string, readonly ScheduleTask[]> {
  if (course === null && status === 'all') {
    return tasksByDay
  }
  const filtered = new Map<string, readonly ScheduleTask[]>()
  for (const [day, tasks] of tasksByDay) {
    const kept = tasks.filter(
      (task) =>
        (course === null || task.course.id === course) && matchesStatus(task, status)
    )
    if (kept.length > 0) {
      filtered.set(day, kept)
    }
  }
  return filtered
}

// 按现在生效的筛选留下来的任务。筛选不变时，每天拿到的还是同一个数组。
export function useFilteredTasksByDay(
  tasksByDay: ReadonlyMap<string, readonly ScheduleTask[]>,
  { course, status }: CalendarFilters
): ReadonlyMap<string, readonly ScheduleTask[]> {
  return useMemo(
    () => filterTasksByDay(tasksByDay, course, status),
    [tasksByDay, course, status]
  )
}
