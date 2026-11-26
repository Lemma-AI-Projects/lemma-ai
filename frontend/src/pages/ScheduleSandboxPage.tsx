import { useId, useMemo, useState } from 'react'
import { format, isBefore, isSameDay, startOfDay } from 'date-fns'

import {
  calendarTaskProgress,
  groupCalendarTasksByDay,
  type CalendarTask,
} from '@/features/schedule/calendar/calendarTasks'
import { type RingMonthMark } from '@/features/schedule/calendar/RingMonthCalendar'
import {
  ScheduleCalendar,
  type ScheduleCalendarVariant,
} from '@/features/schedule/calendar/ScheduleCalendar'
import { dayKey, type ScheduleTask } from '@/features/schedule/getScheduleTasks'
import { ScheduleDayPanel } from '@/features/schedule/ScheduleDayPanel'
import { cn } from '@/lib/utils'
import { getScheduleCalendarSample } from '@/mock/scheduleCalendar'

// 待选的日历方案；每一种都是一整套设计（布局、顶栏、格子里怎么放任务、配色）。
const CALENDAR_OPTIONS: { value: ScheduleCalendarVariant; label: string }[] = [
  { value: 'rings', label: '日环月历' },
  { value: 'titles', label: '任务月历' },
  { value: 'focus-week', label: '聚焦周' },
  { value: 'agenda', label: '日程流' },
]

// 「日环月历」的格子里用什么表示任务。
const RING_MARK_OPTIONS: { value: RingMonthMark; label: string }[] = [
  { value: 'ring', label: '分段圆环' },
  { value: 'dots', label: '圆点' },
]

// 顶栏里的一组候选样式切换：一句说明加一排单选。
function SandboxVariantSwitch<Value extends string>({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string
  onValueChange: (value: Value) => void
  options: { value: Value; label: string }[]
  value: Value
}) {
  const labelId = useId()

  return (
    <div className="flex items-center gap-2">
      <span id={labelId} className="text-xs text-zinc-500">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex rounded-full bg-zinc-200/60 p-0.5"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs transition-colors',
              value === option.value
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// 左栏用的还是日程页现有的任务卡片，这里把日历的任务换成它要的形状。
// 左栏不在这次重新设计的范围里，所以原样保留。
function toPanelTask(task: CalendarTask, courseName: string, today: Date): ScheduleTask {
  const progressRatio = calendarTaskProgress(task)
  return {
    id: task.id,
    title: task.title,
    description: courseName,
    tags: [],
    date: task.date,
    dueDateLabel: format(task.date, 'M月d日'),
    // 新日历不使用时长；现有卡片也不显示它。
    minutes: 0,
    commentCount: 0,
    progress: task.steps,
    progressRatio,
    overdue: isBefore(task.date, today) && progressRatio < 1,
  }
}

// [sandbox] 日程页右侧日历的调试页：和日程页同一套布局（左栏是所选日期的任务，右边是日历），
// 右边的日历可以在几种候选方案之间切换。数据是示例数据，不发任何请求。
export function ScheduleSandboxPage() {
  const [today] = useState(() => startOfDay(new Date()))
  const [selectedDate, setSelectedDate] = useState(today)
  const [variant, setVariant] = useState<ScheduleCalendarVariant>('rings')
  const [ringMark, setRingMark] = useState<RingMonthMark>('ring')

  const { courses, tasksByDay } = useMemo(() => {
    const sample = getScheduleCalendarSample(today)
    return { courses: sample.courses, tasksByDay: groupCalendarTasksByDay(sample.tasks) }
  }, [today])

  const panelTasks = useMemo(() => {
    const courseNames = new Map(courses.map((course) => [course.id, course.name]))
    return (tasksByDay.get(dayKey(selectedDate)) ?? []).map((task) =>
      toPanelTask(task, courseNames.get(task.courseId) ?? '', today)
    )
  }, [courses, selectedDate, tasksByDay, today])

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-zinc-200/80 bg-zinc-50 px-3 py-2">
        <span className="text-xs font-medium text-zinc-400">日程调试</span>
        <SandboxVariantSwitch
          label="日历方案"
          options={CALENDAR_OPTIONS}
          value={variant}
          onValueChange={setVariant}
        />
        {variant === 'rings' && (
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
          <ScheduleCalendar
            // 换方案时重新挂载：每种方案各自记着正在看哪个月，互不相干。
            key={variant}
            variant={variant}
            ringMark={ringMark}
            today={today}
            courses={courses}
            tasksByDay={tasksByDay}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
      </div>
    </div>
  )
}
