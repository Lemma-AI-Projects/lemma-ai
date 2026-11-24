import { format } from 'date-fns'

// 一周七天，周一为 0。
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

// 周期：这门课一共排多久。'date' 表示排到某个截止日。
export type CourseSchedulePeriod = 'none' | '2w' | '1m' | 'date'

// 课程排期。产品不记录学习时长，也不按时长排课，所以这里没有「每天多少分钟 / 多少小时」的字段，
// 只有两件事：每周哪几天有时间学，以及一共排多久。
export interface CourseSchedule {
  // 每周哪几天学，按周一到周日升序；空数组表示不排期。
  weekdays: Weekday[]
  period: CourseSchedulePeriod
  // period 为 'date' 时的截止日（yyyy-MM-dd），未选时为空串。
  endDate: string
}

export const DEFAULT_COURSE_SCHEDULE: CourseSchedule = {
  weekdays: [],
  period: 'none',
  endDate: '',
}

export const WEEKDAY_OPTIONS: { value: Weekday; short: string; label: string }[] = [
  { value: 0, short: '一', label: '周一' },
  { value: 1, short: '二', label: '周二' },
  { value: 2, short: '三', label: '周三' },
  { value: 3, short: '四', label: '周四' },
  { value: 4, short: '五', label: '周五' },
  { value: 5, short: '六', label: '周六' },
  { value: 6, short: '日', label: '周日' },
]

export const EVERY_WEEKDAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

export type CourseSchedulePresetId = 'none' | 'every-day' | 'workdays' | 'weekend'

// 常见的学习日排法；label 同时是下巴胶囊上显示的说法。
export const COURSE_SCHEDULE_PRESETS: {
  id: CourseSchedulePresetId
  label: string
  weekdays: Weekday[]
}[] = [
  { id: 'none', label: '不排期', weekdays: [] },
  { id: 'every-day', label: '每天', weekdays: EVERY_WEEKDAY },
  { id: 'workdays', label: '每个工作日', weekdays: [0, 1, 2, 3, 4] },
  { id: 'weekend', label: '每个周末', weekdays: [5, 6] },
]

export const COURSE_SCHEDULE_PERIOD_OPTIONS: {
  value: CourseSchedulePeriod
  label: string
}[] = [
  { value: 'none', label: '不限' },
  { value: '2w', label: '2 周' },
  { value: '1m', label: '1 个月' },
  { value: 'date', label: '到某天' },
]

export function isCourseScheduled(schedule: CourseSchedule): boolean {
  return schedule.weekdays.length > 0
}

export function matchCourseSchedulePreset(weekdays: Weekday[]) {
  const key = weekdays.join(',')
  return COURSE_SCHEDULE_PRESETS.find((preset) => preset.weekdays.join(',') === key)
}

// 截止日必须晚于今天；yyyy-MM-dd 可以直接按字符串比较。
export function isCourseScheduleEndDateValid(
  endDate: string,
  today: Date = new Date()
): boolean {
  return endDate > format(today, 'yyyy-MM-dd')
}

// 截止日已经过去：选了「到某天」、填了日期，但日期不晚于今天。
export function isCourseScheduleEndDatePast(schedule: CourseSchedule): boolean {
  return (
    schedule.period === 'date' &&
    schedule.endDate !== '' &&
    !isCourseScheduleEndDateValid(schedule.endDate)
  )
}

// 排期菜单的内容高度只在这几件事变化时改变：是否已排期、是否显示日期框、是否显示日期报错。
// 菜单用它作为高度过渡的 key。
export function courseScheduleMenuLayoutKey(schedule: CourseSchedule): string {
  return [
    isCourseScheduled(schedule),
    schedule.period === 'date',
    isCourseScheduleEndDatePast(schedule),
  ].join('-')
}

// 下巴胶囊上的一句话状态，例如「不排期」「每个工作日」「2 周内每周一三五」「12月8日前每天」。
export function courseScheduleSummary(
  schedule: CourseSchedule,
  today: Date = new Date()
): string {
  const preset = matchCourseSchedulePreset(schedule.weekdays)
  const days = WEEKDAY_OPTIONS.filter((option) =>
    schedule.weekdays.includes(option.value)
  )
  const frequency =
    preset?.label ?? `每周${days.map((option) => option.short).join('')}`

  if (!isCourseScheduled(schedule)) {
    return frequency
  }
  if (schedule.period === '2w') {
    return `2 周内${frequency}`
  }
  if (schedule.period === '1m') {
    return `1 个月内${frequency}`
  }
  if (
    schedule.period === 'date' &&
    isCourseScheduleEndDateValid(schedule.endDate, today)
  ) {
    const [, month, day] = schedule.endDate.split('-').map(Number)
    return `${month}月${day}日前${frequency}`
  }
  return frequency
}
