import { useState } from 'react'
import { CalendarDays, Check } from 'lucide-react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'

import { AnimatedHeight } from '@/components/AnimatedHeight'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ComposerChinButton } from '@/features/home/composer/ComposerChinButton'
import { COMPOSER_MENU_ROW_CLASS_NAME } from '@/features/home/composer/composerMenuStyles'
import { CourseSchedulePeriodField } from '@/features/home/composer/CourseSchedulePeriodField'
import {
  COURSE_SCHEDULE_PRESETS,
  courseScheduleMenuLayoutKey,
  courseScheduleSummary,
  isCourseScheduled,
  matchCourseSchedulePreset,
  type CourseSchedule,
} from '@/features/home/composer/courseSchedule'
import { WeekdayPicker } from '@/features/home/composer/WeekdayPicker'
import { cn } from '@/lib/utils'

const CUSTOM_VALUE = 'custom'

const PRESET_ROWS = [
  ...COURSE_SCHEDULE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label })),
  { value: CUSTOM_VALUE, label: '自己选' },
]

// 展开区的固定宽度 = 展开后的菜单宽度（240px）减去两侧边框和内边距（共 10px）。
// 宽度写死是为了让菜单变宽的过程中内容不跟着重排，只是被逐渐露出来。
const EXPANDED_AREA_WIDTH_CLASS_NAME = 'w-[230px]'

// 排期入口（常用预设）：先给几种常见的学习日排法单选；选「自己选」时露出周历逐天挑。
// 只要排了期，菜单就变宽并在下方出现「周期」。
export function CourseSchedulePresetMenu({
  onValueChange,
  value,
}: {
  onValueChange: (value: CourseSchedule) => void
  value: CourseSchedule
}) {
  const preset = matchCourseSchedulePreset(value.weekdays)
  // 用户点过「自己选」后，即使挑出来的日子恰好等于某个预设，也停留在自己选。
  const [customOpen, setCustomOpen] = useState(false)
  const isCustom = customOpen || preset === undefined
  const scheduled = isCourseScheduled(value)
  const expanded = isCustom || scheduled

  const handleValueChange = (next: string) => {
    if (next === CUSTOM_VALUE) {
      setCustomOpen(true)
      return
    }
    const nextPreset = COURSE_SCHEDULE_PRESETS.find((item) => item.id === next)
    if (nextPreset) {
      setCustomOpen(false)
      onValueChange({ ...value, weekdays: nextPreset.weekdays })
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ComposerChinButton icon={CalendarDays}>
          {courseScheduleSummary(value)}
        </ComposerChinButton>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={7}
        aria-label="排期"
        className={cn(
          'overflow-hidden rounded-lg p-1 shadow-none transition-[width] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          expanded ? 'w-60' : 'w-40'
        )}
      >
        <AnimatedHeight animateKey={`${isCustom}-${courseScheduleMenuLayoutKey(value)}`}>
          <RadioGroupPrimitive.Root
            value={isCustom ? CUSTOM_VALUE : preset?.id}
            onValueChange={handleValueChange}
            aria-label="每周学习日"
            className="flex flex-col"
          >
            {PRESET_ROWS.map((row) => (
              <RadioGroupPrimitive.Item
                key={row.value}
                value={row.value}
                className={COMPOSER_MENU_ROW_CLASS_NAME}
              >
                <span className="flex-1 truncate text-left">{row.label}</span>
                <RadioGroupPrimitive.Indicator>
                  <Check className="size-4 shrink-0 text-foreground" />
                </RadioGroupPrimitive.Indicator>
              </RadioGroupPrimitive.Item>
            ))}
          </RadioGroupPrimitive.Root>

          {expanded && (
            <div className={EXPANDED_AREA_WIDTH_CLASS_NAME}>
              <div role="separator" className="my-1 h-px bg-border" />
              {isCustom && (
                <div className="px-2 pt-1.5 pb-2">
                  <WeekdayPicker
                    value={value.weekdays}
                    onValueChange={(weekdays) => onValueChange({ ...value, weekdays })}
                  />
                </div>
              )}
              {scheduled && (
                <CourseSchedulePeriodField
                  value={value}
                  onValueChange={onValueChange}
                  className="pb-2"
                />
              )}
            </div>
          )}
        </AnimatedHeight>
      </PopoverContent>
    </Popover>
  )
}
