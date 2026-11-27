import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from 'date-fns'

import { dayKey } from '../getScheduleTasks'
import { NO_TASKS, useCalendarFilters, useFilteredTasksByDay } from './calendarFilters'
import { CalendarFrame, type CalendarLayout } from './CalendarFrame'
import { CalendarTaskTile } from './CalendarTaskTile'
import {
  CALENDAR_TILE_GAP,
  CALENDAR_TILE_MAX_ASPECT,
  getTaskTileCapacity,
  getTileSpan,
} from './calendarTileStyles'
import { CalendarWeekdayRow } from './ScheduleCalendarParts'
import {
  getWeeks,
  startOfCalendarWeek,
  summarizeCourses,
  useElementSize,
  type ScheduleCalendarProps,
} from './scheduleCalendarShared'

// 往前、往后各能滚多少个月。
const RANGE_MONTHS = 12
// 一屏至少放几周。窗口很高时多放几周，片才不会变成竖着的长方形。
const MIN_VISIBLE_WEEKS = 5
// 还没量到滚动区有多大时，一周先按这么高排。
const FALLBACK_ROW_HEIGHT = 104

// 某一天在第几周（从这张表的第一个周一数起）。
function weekIndexOf(firstMonday: Date, date: Date): number {
  return Math.floor(differenceInCalendarDays(date, firstMonday) / 7)
}

// 这么大的滚动区里一屏放几周：周数取刚好让片差不多不超过正方形的最小值。
function getVisibleWeeks({ width, height }: { width: number; height: number }): number {
  const tileWidth = getTileSpan(width, 7)
  if (tileWidth <= 0) {
    return MIN_VISIBLE_WEEKS
  }
  return Math.max(
    MIN_VISIBLE_WEEKS,
    Math.ceil(
      (height + CALENDAR_TILE_GAP) /
        (tileWidth * CALENDAR_TILE_MAX_ASPECT + CALENDAR_TILE_GAP)
    )
  )
}

// 日历方案「清单 3」：一张可以一直往下滚的周历表，任务名直接写在片里。
//
// - 和「任务月历 4」是同一种外框、同一种日期片，区别只在翻月的方式：这里没有整页切换，
//   所有的周连成一长卷，上下滚动就是翻月，停下时自动对齐到整周。
// - 每一周一样高，一屏正好放整数周（一般是五周）；一块片里能写几行由片的高度决定，
//   写不下的不写，片的右上角标出还有几件。
// - 没有周与周之间的分割线，片与片之间留一道缝。占了画面中间的那个月的片是灰的，
//   其它月份的日子没有底色，滚过去时一个月一个月地亮起来。
// - 年月跟着滚动变；可以按月跳，也可以回到今天。
export function SchedulePlannerTileCalendar({
  layout = 'rail',
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarProps & { layout?: CalendarLayout }) {
  const [scrollRef, viewportSize] = useElementSize<HTMLDivElement>()
  const weeks = useMemo(() => {
    const firstMonday = startOfCalendarWeek(
      startOfMonth(addMonths(today, -RANGE_MONTHS))
    )
    const lastDay = endOfMonth(addMonths(today, RANGE_MONTHS))
    return getWeeks(
      firstMonday,
      Math.ceil((differenceInCalendarDays(lastDay, firstMonday) + 1) / 7)
    )
  }, [today])
  const firstMonday = weeks[0][0]

  const rowHeight = viewportSize
    ? getTileSpan(viewportSize.height, getVisibleWeeks(viewportSize))
    : FALLBACK_ROW_HEIGHT
  // 相邻两周的顶边隔多远。
  const pitch = rowHeight + CALENDAR_TILE_GAP
  // 还没量到滚动区有多高时先不写任务。
  const maxRows = viewportSize ? getTaskTileCapacity(rowHeight) : 0

  // 现在占了画面中间的那个月。
  const [focusMonth, setFocusMonth] = useState(() => startOfMonth(selectedDate))
  // 按了翻月、还在滚过去的路上时，要去的那个月。连按两下时从它接着算，不从还没更新的标题算。
  const targetMonthRef = useRef<Date | null>(null)
  // 现在排在画面最上面的是第几周。一打开是所选日期那个月的第一周。
  const topWeekRef = useRef<number | null>(null)
  const [initialWeekIndex] = useState(() =>
    weekIndexOf(firstMonday, startOfMonth(selectedDate))
  )
  const courses = useMemo(
    () => summarizeCourses(tasksByDay, focusMonth),
    [tasksByDay, focusMonth]
  )
  const filters = useCalendarFilters()
  const shownTasksByDay = useFilteredTasksByDay(tasksByDay, filters)

  // 一打开、以及窗口变高变矮（每一周的高度跟着变）之后，把原来排在最上面的那一周放回最上面。
  useLayoutEffect(() => {
    const viewport = scrollRef.current
    if (viewport) {
      viewport.scrollTop = (topWeekRef.current ?? initialWeekIndex) * pitch
    }
  }, [scrollRef, initialWeekIndex, pitch])

  // 选中的日期完全不在画面里时（比如左栏点了回到今天），滚到它那个月。
  useEffect(() => {
    const viewport = scrollRef.current
    const row = viewport?.children[weekIndexOf(firstMonday, selectedDate)]
    const monthRow =
      viewport?.children[weekIndexOf(firstMonday, startOfMonth(selectedDate))]
    if (
      !viewport ||
      !(row instanceof HTMLElement) ||
      !(monthRow instanceof HTMLElement)
    ) {
      return
    }
    const outOfView =
      row.offsetTop + row.offsetHeight <= viewport.scrollTop ||
      row.offsetTop >= viewport.scrollTop + viewport.clientHeight
    if (outOfView) {
      viewport.scrollTo({ top: monthRow.offsetTop, behavior: 'smooth' })
    }
  }, [scrollRef, firstMonday, selectedDate])

  const scrollToMonth = (month: Date) => {
    targetMonthRef.current = startOfMonth(month)
    scrollRef.current?.scrollTo({
      top: weekIndexOf(firstMonday, startOfMonth(month)) * pitch,
      behavior: 'smooth',
    })
  }

  const handleScroll = () => {
    const viewport = scrollRef.current
    if (!viewport) {
      return
    }
    topWeekRef.current = Math.round(viewport.scrollTop / pitch)
    // 画面正中间落在哪一周。
    const middle = Math.floor((viewport.scrollTop + viewport.clientHeight / 2) / pitch)
    const index = Math.min(Math.max(middle, 0), weeks.length - 1)
    // 一周算在它周四所在的那个月里。
    const month = startOfMonth(weeks[index][3])
    if (targetMonthRef.current && isSameMonth(targetMonthRef.current, month)) {
      targetMonthRef.current = null
    }
    setFocusMonth((current) => (isSameMonth(current, month) ? current : month))
  }

  // 手动滚了，就不再记着刚才要去的那个月。
  const forgetTargetMonth = () => {
    targetMonthRef.current = null
  }

  return (
    <CalendarFrame
      layout={layout}
      month={focusMonth}
      today={today}
      tasksByDay={tasksByDay}
      courses={courses}
      filters={filters}
      onMonthSelect={scrollToMonth}
      onMonthStep={(delta) =>
        scrollToMonth(addMonths(targetMonthRef.current ?? focusMonth, delta))
      }
      onToday={() => {
        onSelectDate(today)
        scrollToMonth(today)
      }}
    >
      <div role="table" aria-label="Schedule" className="flex min-h-0 flex-1 flex-col">
        {/* 星期和片里的日期数字左对齐在同一条竖线上。 */}
        <CalendarWeekdayRow days={weeks[0]} align="start" className="h-8 gap-1 *:pl-2.5" />
        <div
          ref={scrollRef}
          role="rowgroup"
          onScroll={handleScroll}
          onWheel={forgetTargetMonth}
          onTouchMove={forgetTargetMonth}
          className="scrollbar-hidden relative flex min-h-0 flex-1 snap-y snap-proximity flex-col gap-1 overflow-y-auto rounded-[12px]"
        >
          {weeks.map((week) => (
            <div
              key={dayKey(week[0])}
              role="row"
              className="grid shrink-0 snap-start grid-cols-7 gap-1"
              style={{ height: rowHeight }}
            >
              {week.map((day) => (
                <div key={dayKey(day)} role="cell" className="flex min-h-0 min-w-0">
                  <CalendarTaskTile
                    day={day}
                    tasks={shownTasksByDay.get(dayKey(day)) ?? NO_TASKS}
                    maxRows={maxRows}
                    inMonth={isSameMonth(day, focusMonth)}
                    isToday={isSameDay(day, today)}
                    selected={isSameDay(day, selectedDate)}
                    onSelect={() => onSelectDate(day)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </CalendarFrame>
  )
}
