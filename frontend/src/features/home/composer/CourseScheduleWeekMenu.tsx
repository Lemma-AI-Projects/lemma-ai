import { useId } from 'react'
import { CalendarDays } from 'lucide-react'

import { AnimatedHeight } from '@/components/AnimatedHeight'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ComposerChinButton } from '@/features/home/composer/ComposerChinButton'
import { COMPOSER_MENU_LABEL_CLASS_NAME } from '@/features/home/composer/composerMenuStyles'
import { CourseSchedulePeriodField } from '@/features/home/composer/CourseSchedulePeriodField'
import {
  courseScheduleMenuLayoutKey,
  courseScheduleSummary,
  isCourseScheduled,
  type CourseSchedule,
} from '@/features/home/composer/courseSchedule'
import {
  WeekdayPicker,
  type WeekdayPickerAppearance,
} from '@/features/home/composer/WeekdayPicker'

// 排期入口（周历）：点开直接选每周哪几天学，一天都不选就是不排期；选了之后下方出现「周期」。
export function CourseScheduleWeekMenu({
  appearance,
  onValueChange,
  value,
}: {
  appearance: WeekdayPickerAppearance
  onValueChange: (value: CourseSchedule) => void
  value: CourseSchedule
}) {
  const labelId = useId()

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
        className="w-60 rounded-lg p-1 shadow-none"
      >
        <AnimatedHeight animateKey={courseScheduleMenuLayoutKey(value)}>
          <p id={labelId} className={COMPOSER_MENU_LABEL_CLASS_NAME}>
            每周学习日
          </p>
          <div className="px-2 pt-1 pb-2">
            <WeekdayPicker
              appearance={appearance}
              aria-labelledby={labelId}
              value={value.weekdays}
              onValueChange={(weekdays) => onValueChange({ ...value, weekdays })}
            />
          </div>
          {isCourseScheduled(value) && (
            <CourseSchedulePeriodField
              value={value}
              onValueChange={onValueChange}
              className="pb-2"
            />
          )}
        </AnimatedHeight>
      </PopoverContent>
    </Popover>
  )
}
