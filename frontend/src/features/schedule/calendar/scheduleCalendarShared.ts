import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

import type { ScheduleCourse, ScheduleTask } from '../getScheduleTasks'

// 日历候选方案共用的约定和小工具。

// 每一种日历方案拿到的东西都一样。
export interface ScheduleCalendarProps {
  today: Date
  tasksByDay: ReadonlyMap<string, readonly ScheduleTask[]>
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

// 进度的三种颜色：做完的部分、还没做的部分、过了日子还没做完的部分。
export const CALENDAR_DONE_COLOR = '#10b981'
export const CALENDAR_TRACK_COLOR = '#e4e4e7'
export const CALENDAR_OVERDUE_COLOR = '#fca5a5'

// 一周从周一开始。
export function startOfCalendarWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

// 从某个周一起连续 `weekCount` 周，每周七天。
export function getWeeks(firstMonday: Date, weekCount: number): Date[][] {
  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(firstMonday, week * 7 + day))
  )
}

// 一个月的格子：固定六周，前后用邻月的日子补齐，翻月时行数不变。
export function getMonthWeeks(month: Date): Date[][] {
  return getWeeks(startOfCalendarWeek(startOfMonth(month)), 6)
}

// 一个月的格子，只铺到月底所在的那一周：少则四行，多则六行，前后用邻月的日子补齐。
export function getMonthWeeksToEnd(month: Date): Date[][] {
  const firstMonday = startOfCalendarWeek(startOfMonth(month))
  const dayCount = differenceInCalendarDays(endOfMonth(month), firstMonday) + 1
  return getWeeks(firstMonday, Math.ceil(dayCount / 7))
}

// 一个任务在日历里的三种状态。日历只看「做完没有」，不看要花多久。
export type ScheduleTaskStatus = 'done' | 'active' | 'todo'

export function getTaskStatus(task: ScheduleTask): ScheduleTaskStatus {
  if (task.progressRatio >= 1) {
    return 'done'
  }
  return task.progressRatio > 0 ? 'active' : 'todo'
}

// 读屏读到某一天时说的话：完整的日期，后面跟这天有几件事。
export function describeDay(day: Date, taskCount: number): string {
  const date = format(day, 'EEEE, MMMM d, yyyy')
  if (taskCount === 0) {
    return date
  }
  return `${date}, ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`
}

// 日历当前显示的那一段（一个月或一周）的起点。
// 平时由日历自己翻；选中的日期变了（点了邻月的日子、左栏点了回到今天）而且不在
// 这一段里时，跟着跳过去。`unitStart` 要传模块级的函数，例如 startOfMonth。
export function useFollowSelectedDate(
  selectedDate: Date,
  unitStart: (date: Date) => Date
) {
  const [anchor, setAnchor] = useState(() => unitStart(selectedDate))
  const [followed, setFollowed] = useState(selectedDate)

  if (followed.getTime() !== selectedDate.getTime()) {
    setFollowed(selectedDate)
    const next = unitStart(selectedDate)
    if (next.getTime() !== anchor.getTime()) {
      setAnchor(next)
    }
  }

  return [anchor, setAnchor] as const
}

// 所有任务里出现过的课程，按第一次出现的先后。
export function listCourses(
  tasksByDay: ReadonlyMap<string, readonly ScheduleTask[]>
): ScheduleCourse[] {
  const courses = new Map<string, ScheduleCourse>()
  for (const tasks of tasksByDay.values()) {
    for (const task of tasks) {
      if (!courses.has(task.course.id)) {
        courses.set(task.course.id, task.course)
      }
    }
  }
  return [...courses.values()]
}

// 鼠标停在「全部课程」上。
export const ALL_COURSES: unique symbol = Symbol('all courses')

// 鼠标停着的范围：某门课的 id，或者「全部课程」；null 是没停在任何一项上。
type HoveredScope = string | typeof ALL_COURSES | null

// 「按课程看」：只留某一门课的任务，一眼看出这门课排在哪几天。
// 第四轮以及更早的方案用；第五轮改用筛选胶囊，见 calendarFilters.ts。
export interface CourseHighlight {
  // 现在突出的那门课的 id：鼠标停在哪门课上就是哪门，没停着就是点住的那门；都没有是 null。
  active: string | null
  // 点住的那门课的 id。
  pinned: string | null
  setHovered: (scope: HoveredScope) => void
  // 和 setHovered 一样，但要鼠标停稳一小会儿才生效。
  // 给「鼠标移到任务上」用：鼠标划过一片任务时，整张日历不会跟着闪。
  setHoveredSoon: (course: string | null) => void
  setPinned: (course: string | null) => void
  // 点一下固定住，再点一下松开。
  togglePinned: (course: string) => void
}

// 鼠标移到任务上，停多久才突出它的课程；移开后多久恢复。
// 恢复也等一下：从一个任务移到同一门课的另一个任务上时，中间不会闪一下。
const HOVER_INTENT_DELAY = 140
const HOVER_REST_DELAY = 70

export function useCourseHighlight(): CourseHighlight {
  const [hovered, setHoveredNow] = useState<HoveredScope>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const setHovered = (scope: HoveredScope) => {
    window.clearTimeout(timerRef.current)
    setHoveredNow(scope)
  }

  return {
    active: hovered === ALL_COURSES ? null : (hovered ?? pinned),
    pinned,
    setHovered,
    setHoveredSoon: (course) => {
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(
        () => setHoveredNow(course),
        course === null ? HOVER_REST_DELAY : HOVER_INTENT_DELAY
      )
    },
    setPinned,
    togglePinned: (course) =>
      setPinned((current) => (current === course ? null : course)),
  }
}

// 突出某门课时，一个任务要不要淡下去。
export function isTaskDimmed(task: ScheduleTask, highlight: CourseHighlight): boolean {
  return highlight.active !== null && task.course.id !== highlight.active
}

// 突出某门课时，一天里只算这门课的任务；没有突出任何课时就是这天全部的任务。
// 给格子里只画图形的方案用：图形只画这门课的，别的日子自然就空了。
export function pickCourseTasks(
  tasks: readonly ScheduleTask[],
  course: string | null
): readonly ScheduleTask[] {
  return course === null ? tasks : tasks.filter((task) => task.course.id === course)
}

// 几件事里做完了几件。
export interface TaskTally {
  total: number
  done: number
}

// 一个月的键，例如 2026-11。
export function monthKey(date: Date): string {
  return format(date, 'yyyy-MM')
}

// 每个月有几件事、做完了几件。传了 `course` 就只算这门课的。
export function summarizeMonths(
  tasksByDay: ReadonlyMap<string, readonly ScheduleTask[]>,
  course: string | null = null
): Map<string, TaskTally> {
  const summaries = new Map<string, TaskTally>()
  for (const tasks of tasksByDay.values()) {
    for (const task of tasks) {
      if (course !== null && task.course.id !== course) {
        continue
      }
      const key = monthKey(task.date)
      const summary = summaries.get(key) ?? { total: 0, done: 0 }
      summary.total += 1
      if (getTaskStatus(task) === 'done') {
        summary.done += 1
      }
      summaries.set(key, summary)
    }
  }
  return summaries
}

// 一门课在某个月里有几件事、做完了几件。
export interface CourseSummary extends TaskTally {
  course: ScheduleCourse
}

// 每门课在 `month` 这个月里的进度。课程的先后不随月份变，这个月没有安排的课也列出来。
export function summarizeCourses(
  tasksByDay: ReadonlyMap<string, readonly ScheduleTask[]>,
  month: Date
): CourseSummary[] {
  const key = monthKey(month)
  const summaries = new Map<string, CourseSummary>(
    listCourses(tasksByDay).map((course) => [course.id, { course, total: 0, done: 0 }])
  )
  for (const tasks of tasksByDay.values()) {
    for (const task of tasks) {
      const summary = summaries.get(task.course.id)
      if (!summary || monthKey(task.date) !== key) {
        continue
      }
      summary.total += 1
      if (getTaskStatus(task) === 'done') {
        summary.done += 1
      }
    }
  }
  return [...summaries.values()]
}

// 几门课加起来的进度（「全部课程」那一项用）。
export function sumTallies(tallies: readonly TaskTally[]): TaskTally {
  return tallies.reduce<TaskTally>(
    (sum, tally) => ({ total: sum.total + tally.total, done: sum.done + tally.done }),
    { total: 0, done: 0 }
  )
}

// 做完了百分之几；一件事都没有时是 0。
export function tallyPercent({ done, total }: TaskTally): number {
  return total > 0 ? (done / total) * 100 : 0
}

// 一个元素现在的宽和高，跟着它的尺寸变；还没量到之前是 null。
// 用法：把返回的 ref 交给要量的元素。
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) {
      return undefined
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      // 量到的尺寸要赶在这一帧画出来之前用上，不然会先画一帧没排好的。
      flushSync(() => {
        setSize((current) =>
          current && current.width === width && current.height === height
            ? current
            : { width, height }
        )
      })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, size] as const
}
