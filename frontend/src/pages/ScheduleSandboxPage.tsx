import { useMemo, useState } from 'react'
import { isSameDay, startOfDay } from 'date-fns'

import { SandboxVariantSwitch } from '@/components/SandboxVariantSwitch'
import { type CalendarLayout } from '@/features/schedule/calendar/CalendarFrame'
import { type CalendarCourseEntry } from '@/features/schedule/calendar/courseEntry/calendarCourseEntry'
import {
  ScheduleCalendar,
  type ScheduleCalendarVariant,
} from '@/features/schedule/calendar/ScheduleCalendar'
import { groupCalendarTasksByDay } from '@/features/schedule/calendarDesign/calendarTasks'
import {
  DesignScheduleCalendar,
  type DesignCalendarVariant,
} from '@/features/schedule/calendarDesign/DesignScheduleCalendar'
import { type RingMonthMark } from '@/features/schedule/calendarDesign/RingMonthCalendar'
import {
  dayKey,
  getScheduleTasks,
  groupTasksByDay,
} from '@/features/schedule/getScheduleTasks'
import { ScheduleDayPanel } from '@/features/schedule/ScheduleDayPanel'
import { cn } from '@/lib/utils'
import { getScheduleCalendarSample } from '@/mock/scheduleCalendar'

// 两批候选方案共用一个选中项：
// - first：features/schedule/calendar 里的，用日程页现有的任务数据；
// - design：features/schedule/calendarDesign 里的（来自 schedule-design 分支），用自己的示例数据，
//   每个任务属于一门课、分成几步，没有描述、标签和评论数。
// 左栏的任务卡片不管右边切到哪一套，都用 first 的数据：design 的数据填不满卡片。
// 所以切到 design 的四套时，左栏和日历里的任务对不上，这是有意的。
type CalendarOption =
  | `first:${ScheduleCalendarVariant}`
  | `design:${DesignCalendarVariant}`

// 这一轮的新方案（第五轮）。
const CURRENT_ROUND_OPTIONS: { value: CalendarOption; label: string }[] = [
  { value: 'first:ring-month', label: '日环月历 5' },
  { value: 'first:task-tile', label: '任务月历 4' },
  { value: 'first:planner-tile', label: '清单 3' },
  { value: 'first:focus-week', label: '聚焦周 3' },
]

// 这一轮的外框：左边一栏月份，还是上面一条顶栏。
const LAYOUT_OPTIONS: { value: CalendarLayout; label: string }[] = [
  { value: 'rail', label: '侧栏' },
  { value: 'header', label: '顶栏' },
]

// 上一轮的四套（第四轮），原样留着对照。
const PREVIOUS_ROUND_OPTIONS: { value: CalendarOption; label: string }[] = [
  { value: 'first:entry-ring-month', label: '日环月历 4' },
  { value: 'first:entry-task-tile', label: '任务月历 3' },
  { value: 'first:entry-planner-tile', label: '清单 2' },
  { value: 'first:entry-focus-week', label: '聚焦周 2' },
]

// 上一轮里，课程放在哪、从哪里进「按课程看」。
const COURSE_ENTRY_OPTIONS: { value: CalendarCourseEntry; label: string }[] = [
  { value: 'sidebar', label: '侧栏' },
  { value: 'menu', label: '下拉' },
  { value: 'task-hover', label: '悬停任务' },
  { value: 'legend', label: '底部图例' },
]

// 「日环月历 4」的格子里没有任务名，没法从任务进。
function getCourseEntryOptions(option: CalendarOption) {
  return option === 'first:entry-ring-month'
    ? COURSE_ENTRY_OPTIONS.filter((item) => item.value !== 'task-hover')
    : COURSE_ENTRY_OPTIONS
}

// 还没在「课程」里选过时，每套方案先用最适合它的做法：
// 只画圆环的格子窄一点没关系，配侧栏；要写任务名的格子越宽越好，配不占宽度的下拉。
function getDefaultCourseEntry(option: CalendarOption): CalendarCourseEntry {
  return option === 'first:entry-ring-month' ? 'sidebar' : 'menu'
}

// 更早几轮看过的方案，留着对照。方案多了，收进一个下拉框里，不占顶栏的地方。
const EARLIER_OPTION_GROUPS: {
  label: string
  options: { value: CalendarOption; label: string }[]
}[] = [
  {
    label: '第三轮',
    options: [
      { value: 'first:ring-tile', label: '日环月历 3' },
      { value: 'first:ring-outline', label: '环 2' },
    ],
  },
  {
    label: '第二轮',
    options: [
      { value: 'first:task-month', label: '任务月历 2' },
      { value: 'first:month-board', label: '月历加周栏' },
      { value: 'first:ring-rail', label: '日环月历 2' },
    ],
  },
  {
    label: '第一轮',
    options: [
      { value: 'first:current', label: '现状' },
      { value: 'first:rings', label: '环' },
      { value: 'first:planner', label: '清单' },
      { value: 'first:tray', label: '托盘' },
      { value: 'first:week', label: '周' },
    ],
  },
  {
    label: 'schedule-design 分支',
    options: [
      { value: 'design:rings', label: '日环月历' },
      { value: 'design:titles', label: '任务月历' },
      { value: 'design:focus-week', label: '聚焦周' },
      { value: 'design:agenda', label: '日程流' },
    ],
  },
]

// 「日环月历」的格子里用什么表示任务。
const RING_MARK_OPTIONS: { value: RingMonthMark; label: string }[] = [
  { value: 'ring', label: '分段圆环' },
  { value: 'dots', label: '圆点' },
]

// [sandbox] 日程调试页：和日程页（SchedulePage）同一套布局，左栏原样不动，
// 只把右侧的日历换成候选方案，用来对比。数据是示例数据，不发任何请求。
export function ScheduleSandboxPage() {
  const [today] = useState(() => startOfDay(new Date()))
  const [selectedDate, setSelectedDate] = useState(today)
  const [option, setOption] = useState<CalendarOption>('first:ring-month')
  const [ringMark, setRingMark] = useState<RingMonthMark>('ring')
  const [layout, setLayout] = useState<CalendarLayout>('rail')
  // 在「课程」里选过之后，换方案也沿用这个选择；没选过是 null。
  const [chosenCourseEntry, setCourseEntry] = useState<CalendarCourseEntry | null>(null)

  const firstTasksByDay = useMemo(
    () => groupTasksByDay(getScheduleTasks(today)),
    [today]
  )
  const design = useMemo(() => {
    const sample = getScheduleCalendarSample(today)
    return {
      courses: sample.courses,
      tasksByDay: groupCalendarTasksByDay(sample.tasks),
    }
  }, [today])

  const [set, variant] = option.split(':') as ['first' | 'design', string]
  const isCurrentRound = CURRENT_ROUND_OPTIONS.some((item) => item.value === option)
  const isPreviousRound = PREVIOUS_ROUND_OPTIONS.some((item) => item.value === option)
  const isEarlierOption = !isCurrentRound && !isPreviousRound
  const courseEntryOptions = getCourseEntryOptions(option)
  // 没选过、或者这套方案不支持选的那种做法时，用这套方案默认的。
  const courseEntry =
    chosenCourseEntry !== null &&
    courseEntryOptions.some((item) => item.value === chosenCourseEntry)
      ? chosenCourseEntry
      : getDefaultCourseEntry(option)
  const panelTasks = firstTasksByDay.get(dayKey(selectedDate)) ?? []

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-zinc-200/80 bg-zinc-50 px-3 py-2">
        <span className="text-xs font-medium text-zinc-400">日程调试</span>
        <SandboxVariantSwitch
          label="本轮"
          options={CURRENT_ROUND_OPTIONS}
          value={option}
          onValueChange={setOption}
        />
        {isCurrentRound && (
          <SandboxVariantSwitch
            label="布局"
            options={LAYOUT_OPTIONS}
            value={layout}
            onValueChange={setLayout}
          />
        )}
        <SandboxVariantSwitch
          label="上一轮"
          options={PREVIOUS_ROUND_OPTIONS}
          value={option}
          onValueChange={setOption}
        />
        {isPreviousRound && (
          <SandboxVariantSwitch
            label="课程"
            options={courseEntryOptions}
            value={courseEntry}
            onValueChange={setCourseEntry}
          />
        )}
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          更早的方案
          <select
            // 现在看的是这一轮的方案时，下拉框停在提示那一项上。
            value={isEarlierOption ? option : ''}
            onChange={(event) => setOption(event.target.value as CalendarOption)}
            className={cn(
              'h-6 rounded-full bg-zinc-200/60 px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-zinc-300',
              isEarlierOption ? 'text-zinc-900' : 'text-zinc-500'
            )}
          >
            <option value="" disabled>
              选一个对照
            </option>
            {EARLIER_OPTION_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {option === 'design:rings' && (
          <SandboxVariantSwitch
            label="格子里的标记"
            options={RING_MARK_OPTIONS}
            value={ringMark}
            onValueChange={setRingMark}
          />
        )}
      </div>

      <div className="flex min-h-0 flex-1 gap-2">
        <ScheduleDayPanel
          date={selectedDate}
          isToday={isSameDay(selectedDate, today)}
          tasks={panelTasks}
          onBackToToday={() => setSelectedDate(today)}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-50">
          {/* 换方案时整个重建：每个方案各自记着正在看哪个月（或哪一周），都从今天开始。 */}
          {set === 'first' ? (
            <ScheduleCalendar
              key={option}
              variant={variant as ScheduleCalendarVariant}
              layout={layout}
              courseEntry={courseEntry}
              today={today}
              tasksByDay={firstTasksByDay}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          ) : (
            <DesignScheduleCalendar
              key={option}
              variant={variant as DesignCalendarVariant}
              ringMark={ringMark}
              today={today}
              courses={design.courses}
              tasksByDay={design.tasksByDay}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}
        </div>
      </div>
    </div>
  )
}
