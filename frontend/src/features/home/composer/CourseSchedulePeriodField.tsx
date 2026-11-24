import { useId } from 'react'
import { addDays, format } from 'date-fns'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'

import { Input } from '@/components/ui/input'
import {
  COMPOSER_MENU_LABEL_CLASS_NAME,
  COMPOSER_PANEL_CHIP_SELECTED_CLASS_NAME,
  COMPOSER_PANEL_LABEL_CLASS_NAME,
} from '@/features/home/composer/composerMenuStyles'
import {
  COURSE_SCHEDULE_PERIOD_OPTIONS,
  isCourseScheduleEndDatePast,
  type CourseSchedule,
} from '@/features/home/composer/courseSchedule'
import { cn } from '@/lib/utils'

// - track：直接放在白色菜单里，一条浅灰轨道加白色选中块；
// - chips：放在浅灰面板里，四个等宽的胶囊，选中的变成带细边的白片（与 WeekdayPicker 的 chips 配套）。
export type CourseSchedulePeriodFieldAppearance = 'track' | 'chips'

const APPEARANCE_CLASS_NAMES: Record<
  CourseSchedulePeriodFieldAppearance,
  {
    label: string
    body: string
    group: string
    item: string
    itemSelected: string
    itemIdle: string
  }
> = {
  track: {
    label: COMPOSER_MENU_LABEL_CLASS_NAME,
    body: 'px-2',
    group: 'rounded-full bg-zinc-200/60 p-[3px]',
    item: 'h-[22px]',
    itemSelected: 'bg-white',
    itemIdle: '',
  },
  chips: {
    label: COMPOSER_PANEL_LABEL_CLASS_NAME,
    body: '',
    group: 'gap-1',
    item: 'h-7',
    itemSelected: COMPOSER_PANEL_CHIP_SELECTED_CLASS_NAME,
    itemIdle: 'hover:bg-zinc-200/70',
  },
}

// 排期菜单里的「周期」一栏：这门课一共排多久；选「到某天」时多出一个日期框。
// 五种排期菜单共用，只在已经选了学习日之后出现。
export function CourseSchedulePeriodField({
  appearance = 'track',
  className,
  onValueChange,
  value,
}: {
  appearance?: CourseSchedulePeriodFieldAppearance
  className?: string
  onValueChange: (value: CourseSchedule) => void
  value: CourseSchedule
}) {
  const labelId = useId()
  const dateInputId = useId()
  const dateErrorId = useId()
  const isEndDatePast = isCourseScheduleEndDatePast(value)
  const classNames = APPEARANCE_CLASS_NAMES[appearance]
  const dateInputProps = {
    type: 'date',
    min: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    value: value.endDate,
    onChange: (event: { target: { value: string } }) =>
      onValueChange({ ...value, endDate: event.target.value }),
    'aria-invalid': isEndDatePast,
    'aria-describedby': isEndDatePast ? dateErrorId : undefined,
  }

  return (
    <div className={className}>
      <p id={labelId} className={classNames.label}>
        周期
      </p>
      <div className={classNames.body}>
        <ToggleGroupPrimitive.Root
          type="single"
          value={value.period}
          onValueChange={(next) => {
            const option = COURSE_SCHEDULE_PERIOD_OPTIONS.find(
              (item) => item.value === next
            )
            if (option) {
              onValueChange({ ...value, period: option.value })
            }
          }}
          aria-labelledby={labelId}
          className={cn('flex w-full', classNames.group)}
        >
          {COURSE_SCHEDULE_PERIOD_OPTIONS.map((option) => (
            <ToggleGroupPrimitive.Item
              key={option.value}
              value={option.value}
              className={cn(
                'min-w-0 flex-1 rounded-full text-xs whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300',
                classNames.item,
                value.period === option.value
                  ? cn('font-medium text-zinc-950', classNames.itemSelected)
                  : cn('text-zinc-500 hover:text-zinc-900', classNames.itemIdle)
              )}
            >
              {option.label}
            </ToggleGroupPrimitive.Item>
          ))}
        </ToggleGroupPrimitive.Root>

        {value.period === 'date' &&
          (appearance === 'chips' ? (
            // 和上面的选项同一种白片：左边一句说明，右边是日期。
            <label
              htmlFor={dateInputId}
              className={cn(
                'mt-1 flex h-7 items-center rounded-full pr-1.5 pl-3 text-xs transition-shadow focus-within:ring-2 focus-within:ring-zinc-300',
                COMPOSER_PANEL_CHIP_SELECTED_CLASS_NAME,
                isEndDatePast && 'ring-destructive/40'
              )}
            >
              <span className="text-zinc-500">截止到</span>
              <input
                id={dateInputId}
                {...dateInputProps}
                className={cn(
                  // 浏览器自带的日历图标是纯黑的，压到和说明文字差不多的深浅。
                  'ml-auto bg-transparent text-right text-xs tabular-nums outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-45',
                  value.endDate === '' ? 'text-zinc-400' : 'text-zinc-950'
                )}
              />
            </label>
          ) : (
            <Input
              aria-label="截止日期"
              {...dateInputProps}
              className="mt-1.5 block h-7 rounded-full border-zinc-200 bg-white px-2.5 py-0 text-xs text-zinc-900 focus-visible:border-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-300/60 md:text-xs"
            />
          ))}
        {isEndDatePast && (
          <p
            id={dateErrorId}
            className="pt-1.5 text-xs leading-4 text-destructive"
          >
            这个日期已经过了，选今天之后的一天。
          </p>
        )}
      </div>
    </div>
  )
}
