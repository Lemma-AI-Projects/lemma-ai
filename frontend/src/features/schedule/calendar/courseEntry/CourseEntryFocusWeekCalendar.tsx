import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'

import { cn } from '@/lib/utils'
import { dayKey, type ScheduleTask } from '../../getScheduleTasks'
import {
  CALENDAR_TILE_GAP,
  calendarTileClassName,
  calendarTileTrackColor,
} from '../calendarTileStyles'
import { DayRing } from '../DayRing'
import {
  CalendarDayNumber,
  CalendarDayPeek,
  CalendarDayPeekProvider,
  CalendarTaskHint,
  CalendarWeekdayRow,
  TaskStatusGlyph,
} from '../ScheduleCalendarParts'
import {
  describeDay,
  getMonthWeeksToEnd,
  getTaskStatus,
  isTaskDimmed,
  pickCourseTasks,
  startOfCalendarWeek,
  summarizeCourses,
  useCourseHighlight,
  useElementSize,
  useFollowSelectedDate,
  type CourseHighlight,
  type ScheduleCalendarProps,
} from '../scheduleCalendarShared'
import { type CalendarCourseEntry } from './calendarCourseEntry'
import { CourseEntryFrame } from './CourseEntryFrame'

// 圆环的直径和线宽。
const RING_SIZE = 46
const RING_STROKE_WIDTH = 3

// 放圆环的那一条最矮这么高（和下面 grid-rows 里的 60px 对应）。
const RING_TRACK_MIN_HEIGHT = 60
// 展开的那一周，任务名这一块最高这么高：再高，一周就把整个月压扁了。
const TASK_LIST_MAX_HEIGHT = 212
// 窗口很矮时也至少留这么高，放得下一个折成两行的任务。
const TASK_LIST_MIN_HEIGHT = 44
// 任务名这一块的下内边距、任务之间的间隔、一行字的高度（和下面的样式对应）。
const TASK_LIST_PADDING_BOTTOM = 10
const TASK_GAP = 6
const TASK_LINE_HEIGHT = 16

function weekKey(date: Date): string {
  return dayKey(startOfCalendarWeek(date))
}

// 高度不一的几个任务从上往下排，`maxHeight` 里完整放得下前几个。
// 放不全时要留一行写「+N」。还没量到高度的任务先按折成两行算。
function countFitting(
  tasks: readonly ScheduleTask[],
  heights: ReadonlyMap<string, number>,
  maxHeight: number
): number {
  const sizes = tasks.map((task) => heights.get(task.id) ?? TASK_LINE_HEIGHT * 2)
  const total = sizes.reduce((sum, size) => sum + size, 0) + TASK_GAP * (sizes.length - 1)
  if (total <= maxHeight) {
    return tasks.length
  }

  let used = TASK_LINE_HEIGHT
  let count = 0
  for (const size of sizes) {
    used += size + TASK_GAP
    if (used > maxHeight) {
      break
    }
    count += 1
  }
  return count
}

// 展开的那一周里，一天的任务名：一条最多折两行，从上往下排，最高 `maxHeight`。
// 放不下的不写，最后一行标出还有几件（+N）。
function FocusWeekTasks({
  highlight,
  maxHeight,
  taskHover,
  tasks,
}: {
  highlight: CourseHighlight
  maxHeight: number
  taskHover: boolean
  tasks: readonly ScheduleTask[]
}) {
  const listRef = useRef<HTMLSpanElement>(null)
  // 每个任务排出来有多高（一行还是两行），量出来才知道放得下几个。
  const [heights, setHeights] = useState<ReadonlyMap<string, number>>(() => new Map())

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) {
      return undefined
    }
    const observer = new ResizeObserver((entries) => {
      // 量到的高度要赶在这一帧画出来之前用上。
      flushSync(() => {
        setHeights((current) => {
          let next: Map<string, number> | null = null
          for (const entry of entries) {
            const id =
              entry.target instanceof HTMLElement ? entry.target.dataset.taskId : undefined
            const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height
            if (id !== undefined && current.get(id) !== height) {
              next ??= new Map(current)
              next.set(id, height)
            }
          }
          return next ?? current
        })
      })
    })
    for (const item of list.querySelectorAll('[data-task-id]')) {
      observer.observe(item)
    }
    return () => observer.disconnect()
    // 任务变了、或者任务外面多包了一层浮层，排出来的元素是新的，要重新盯上。
  }, [tasks, taskHover])

  const visibleCount = countFitting(tasks, heights, maxHeight - TASK_LIST_PADDING_BOTTOM)
  const hidden = tasks.slice(visibleCount)

  return (
    <span
      ref={listRef}
      className="relative flex min-w-0 flex-col gap-1.5 px-2 pb-2.5 text-left"
    >
      {tasks.map((task, index) => {
        const shown = index < visibleCount
        const item = (
          <span
            key={task.id}
            data-task-id={task.id}
            // 鼠标移到任务上，就突出它所属的那门课。
            onPointerEnter={
              taskHover ? () => highlight.setHoveredSoon(task.course.id) : undefined
            }
            onPointerLeave={taskHover ? () => highlight.setHoveredSoon(null) : undefined}
            className={cn(
              'flex items-start gap-1.5 text-[12.5px] leading-4 transition-opacity duration-150',
              getTaskStatus(task) === 'done' ? 'text-zinc-500' : 'text-zinc-950',
              isTaskDimmed(task, highlight) && 'opacity-25',
              // 放不下的任务不显示，但还按原来的宽度排着：窗口变了要重新量它有多高。
              !shown && 'pointer-events-none invisible absolute inset-x-2 top-0'
            )}
          >
            <TaskStatusGlyph task={task} size={10} quiet className="mt-[3px]" />
            {/* 十个字母以上的长单词可以用连字符断开；浏览器不肯加连字符的
                （首字母大写的单词），放不下时才从中间断。 */}
            <span className="line-clamp-2 min-w-0 flex-1 break-words hyphens-auto [hyphenate-limit-chars:10_4_4]">
              {task.title}
            </span>
          </span>
        )

        return taskHover ? (
          <CalendarTaskHint key={task.id} task={task}>
            {item}
          </CalendarTaskHint>
        ) : (
          item
        )
      })}
      {/* 没写出来的还有几件，和任务名左对齐。里面没有要突出的那门课时，跟着淡下去。 */}
      {hidden.length > 0 && (
        <span
          className={cn(
            'pl-4 text-[12px] leading-4 text-zinc-500 tabular-nums transition-opacity duration-150',
            hidden.every((task) => isTaskDimmed(task, highlight)) && 'opacity-25'
          )}
        >
          +{hidden.length}
        </span>
      )}
    </span>
  )
}

// 日历方案「聚焦周 2」：整个月都在，但只有一周是展开的。
//
// - 每一天是一块浅灰的圆角片，里面一圈分段的进度环；展开的那一周，圆环下面列出这天的任务名
//   （一条最多折两行）。点哪一天，那一周就展开，原来那周收起，高度有过渡。
// - 整个月刚好铺满、不滚动：展开的那一周有高度上限，写不下的任务不写，最后一行标出还有几件。
// - 展开的是选中日期所在的那一周；翻到别的月份、选中的日期不在这个月里时，
//   展开今天所在的那周，今天也不在就展开第一周。
// - 课程放在哪由 `courseEntry` 决定。突出一门课时，圆环只画这门课的任务，
//   展开那周里其它课的任务淡下去。
// - 今天是数字下面一个小圆点；悬停和选中都只是底色深一档。
export function CourseEntryFocusWeekCalendar({
  courseEntry = 'menu',
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarProps & { courseEntry?: CalendarCourseEntry }) {
  const [month, setMonthStart] = useFollowSelectedDate(selectedDate, startOfMonth)
  const weeks = useMemo(() => getMonthWeeksToEnd(month), [month])
  const courses = useMemo(() => summarizeCourses(tasksByDay, month), [tasksByDay, month])
  const highlight = useCourseHighlight()
  const [gridRef, gridSize] = useElementSize<HTMLDivElement>()

  const weekKeys = weeks.map((week) => dayKey(week[0]))
  const focusedWeekKey =
    [weekKey(selectedDate), weekKey(today)].find((key) => weekKeys.includes(key)) ??
    weekKeys[0]

  // 任务名这一块最高多高：各周的圆环那一条都排下之后剩下的高度，而且不超过上限。
  const spareHeight = gridSize
    ? gridSize.height -
      weeks.length * RING_TRACK_MIN_HEIGHT -
      (weeks.length - 1) * CALENDAR_TILE_GAP
    : TASK_LIST_MIN_HEIGHT
  const taskListMaxHeight = Math.min(
    Math.max(spareHeight, TASK_LIST_MIN_HEIGHT),
    TASK_LIST_MAX_HEIGHT
  )

  return (
    <CalendarDayPeekProvider>
      <CourseEntryFrame
        courseEntry={courseEntry}
        month={month}
        courses={courses}
        highlight={highlight}
        onMonthStep={(delta) => setMonthStart((current) => addMonths(current, delta))}
        onToday={() => {
          onSelectDate(today)
          setMonthStart(startOfMonth(today))
        }}
      >
        <div
          role="table"
          aria-label={format(month, 'MMMM yyyy')}
          className="flex min-h-0 flex-1 flex-col"
        >
          <CalendarWeekdayRow days={weeks[0]} className="h-8 gap-1" />
          <div
            ref={gridRef}
            role="rowgroup"
            // 正常的窗口里不会滚；只有窗口矮到连圆环都排不下时才滚。
            className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto rounded-[12px]"
          >
            {weeks.map((week) => {
              const focused = dayKey(week[0]) === focusedWeekKey

              return (
                <div
                  key={dayKey(week[0])}
                  role="row"
                  // 每一周分上下两条轨道：上面一条放圆环，下面一条放任务名（收起时高度为 0）。
                  // 多出来的高度由各周平分，全都加在圆环那一条上，所以不管哪一周展开，
                  // 每一行圆环的上下间距都一样。
                  className="grid shrink-0 grow basis-auto grid-cols-7 grid-rows-[minmax(60px,1fr)_auto] gap-x-1"
                >
                  {week.map((day) => {
                    const allTasks = tasksByDay.get(dayKey(day)) ?? []
                    const ringTasks = pickCourseTasks(allTasks, highlight.active)
                    const selected = isSameDay(day, selectedDate)
                    const isToday = isSameDay(day, today)
                    const inMonth = isSameMonth(day, month)

                    return (
                      // 一天占上下两条轨道（subgrid），所以同一周里七天的圆环对齐、任务名也从同一条线开始。
                      <div
                        key={dayKey(day)}
                        role="cell"
                        className="row-span-2 grid min-w-0 grid-rows-subgrid"
                      >
                        {/* 收起的那几周看不到任务名，鼠标停一下浮出来；展开的那一周不浮。 */}
                        <CalendarDayPeek tasks={ringTasks} disabled={focused}>
                          <button
                            type="button"
                            aria-label={describeDay(day, allTasks.length)}
                            aria-pressed={selected}
                            onClick={() => onSelectDate(day)}
                            className={cn(
                              'row-span-2 grid min-w-0 grid-rows-subgrid',
                              calendarTileClassName({ inMonth, selected })
                            )}
                          >
                            <span className="flex items-center justify-center">
                              <span
                                className={cn(
                                  'relative flex items-center justify-center',
                                  !inMonth && 'opacity-40'
                                )}
                                style={{ width: RING_SIZE, height: RING_SIZE }}
                              >
                                <DayRing
                                  tasks={ringTasks}
                                  size={RING_SIZE}
                                  strokeWidth={RING_STROKE_WIDTH}
                                  trackColor={calendarTileTrackColor(selected)}
                                  className="absolute inset-0"
                                />
                                <CalendarDayNumber
                                  day={day}
                                  isToday={isToday}
                                  todayStyle="plain"
                                  className={cn(
                                    'text-[15px] transition-colors',
                                    isToday
                                      ? 'font-semibold text-zinc-950'
                                      : ringTasks.length > 0
                                        ? 'text-zinc-950'
                                        : 'font-normal text-zinc-400'
                                  )}
                                />
                                {/* 今天：数字下面一个小圆点。 */}
                                {isToday && (
                                  <span
                                    aria-hidden
                                    className="absolute bottom-[8px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-zinc-950"
                                  />
                                )}
                              </span>
                            </span>

                            {/* 任务名只在展开的那一周显示。高度用 grid 的 0fr → 1fr 过渡，不用量。 */}
                            <span
                              aria-hidden={!focused}
                              className={cn(
                                'grid min-w-0 transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
                                focused
                                  ? 'grid-rows-[1fr] opacity-100'
                                  : 'grid-rows-[0fr] opacity-0'
                              )}
                            >
                              <span
                                className={cn(
                                  'min-h-0 overflow-hidden',
                                  !inMonth && 'opacity-45'
                                )}
                              >
                                <FocusWeekTasks
                                  tasks={allTasks}
                                  maxHeight={taskListMaxHeight}
                                  highlight={highlight}
                                  taskHover={courseEntry === 'task-hover'}
                                />
                              </span>
                            </span>
                          </button>
                        </CalendarDayPeek>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </CourseEntryFrame>
    </CalendarDayPeekProvider>
  )
}
