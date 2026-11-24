import { CourseScheduleChecklistMenu } from '@/features/home/composer/CourseScheduleChecklistMenu'
import { CourseSchedulePresetMenu } from '@/features/home/composer/CourseSchedulePresetMenu'
import { CourseScheduleSwitchMenu } from '@/features/home/composer/CourseScheduleSwitchMenu'
import { CourseScheduleWeekMenu } from '@/features/home/composer/CourseScheduleWeekMenu'
import { type CourseSchedule } from '@/features/home/composer/courseSchedule'

// 排期菜单的候选样式：
// - dots：点开就是七个圆点，逐天点选；
// - bar：七格连成一条周历，相邻的选中日连成一段；
// - switch：先一个「排进日程」开关，打开后展开圆点周历；
// - checklist：周一到周日的勾选清单；
// - presets：几种常见排法单选，另有「自己选」展开圆点周历。
export type CourseScheduleMenuVariant =
  | 'dots'
  | 'bar'
  | 'switch'
  | 'checklist'
  | 'presets'

// 排期入口：收集用户每周哪几天有时间学，具体长什么样由 `variant` 决定。
export function CourseScheduleMenu({
  onValueChange,
  value,
  variant,
}: {
  onValueChange: (value: CourseSchedule) => void
  value: CourseSchedule
  variant: CourseScheduleMenuVariant
}) {
  if (variant === 'switch') {
    return <CourseScheduleSwitchMenu value={value} onValueChange={onValueChange} />
  }
  if (variant === 'checklist') {
    return <CourseScheduleChecklistMenu value={value} onValueChange={onValueChange} />
  }
  if (variant === 'presets') {
    return <CourseSchedulePresetMenu value={value} onValueChange={onValueChange} />
  }
  return (
    <CourseScheduleWeekMenu
      appearance={variant}
      value={value}
      onValueChange={onValueChange}
    />
  )
}
