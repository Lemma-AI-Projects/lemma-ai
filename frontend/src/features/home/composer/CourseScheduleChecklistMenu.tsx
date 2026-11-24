import { useId } from 'react'
import { CalendarDays, Check } from 'lucide-react'

import { AnimatedHeight } from '@/components/AnimatedHeight'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ComposerChinButton } from '@/features/home/composer/ComposerChinButton'
import {
  COMPOSER_MENU_LABEL_CLASS_NAME,
  COMPOSER_MENU_ROW_CLASS_NAME,
} from '@/features/home/composer/composerMenuStyles'
import { CourseSchedulePeriodField } from '@/features/home/composer/CourseSchedulePeriodField'
import {
  WEEKDAY_OPTIONS,
  courseScheduleMenuLayoutKey,
  courseScheduleSummary,
  isCourseScheduled,
  type CourseSchedule,
  type Weekday,
} from '@/features/home/composer/courseSchedule'

// 排期入口（勾选清单）：周一到周日逐行勾选，样子和其它下巴菜单的列表一致；
// 选了之后下方出现「周期」。
export function CourseScheduleChecklistMenu({
  onValueChange,
  value,
}: {
  onValueChange: (value: CourseSchedule) => void
  value: CourseSchedule
}) {
  const labelId = useId()

  const toggleWeekday = (weekday: Weekday) => {
    onValueChange({
      ...value,
      weekdays: WEEKDAY_OPTIONS.filter((option) =>
        option.value === weekday
          ? !value.weekdays.includes(weekday)
          : value.weekdays.includes(option.value)
      ).map((option) => option.value),
    })
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
        className="w-56 rounded-lg p-1 shadow-none"
      >
        <AnimatedHeight animateKey={courseScheduleMenuLayoutKey(value)}>
          <p id={labelId} className={COMPOSER_MENU_LABEL_CLASS_NAME}>
            每周学习日
          </p>
          <div role="group" aria-labelledby={labelId}>
            {WEEKDAY_OPTIONS.map((option) => {
              const checked = value.weekdays.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleWeekday(option.value)}
                  className={COMPOSER_MENU_ROW_CLASS_NAME}
                >
                  <span className="flex-1 truncate text-left">{option.label}</span>
                  {checked && <Check className="size-4 shrink-0 text-foreground" />}
                </button>
              )
            })}
          </div>
          {isCourseScheduled(value) && (
            <>
              <div role="separator" className="my-1 h-px bg-border" />
              <CourseSchedulePeriodField
                value={value}
                onValueChange={onValueChange}
                className="pb-2"
              />
            </>
          )}
        </AnimatedHeight>
      </PopoverContent>
    </Popover>
  )
}
