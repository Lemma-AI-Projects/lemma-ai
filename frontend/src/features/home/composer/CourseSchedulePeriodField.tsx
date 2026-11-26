import { useId } from 'react'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'

import {
  COMPOSER_MENU_LABEL_CLASS_NAME,
  COMPOSER_PANEL_FIELD_CLASS_NAME,
  COMPOSER_PANEL_IDLE_HOVER_CLASS_NAME,
  COMPOSER_PANEL_LABEL_CLASS_NAME,
  COMPOSER_PANEL_SELECTED_CLASS_NAME,
} from '@/features/home/composer/composerMenuStyles'
import { CourseScheduleEndDatePicker } from '@/features/home/composer/CourseScheduleEndDatePicker'
import {
  COURSE_SCHEDULE_PERIOD_OPTIONS,
  isCourseScheduleEndDatePast,
  type CourseSchedule,
} from '@/features/home/composer/courseSchedule'
import { cn } from '@/lib/utils'

// - track：直接放在白色菜单里，一条浅灰轨道加白色选中块；
// - chips：放在面板里，四个等宽的胶囊，选中的变成白片（与 WeekdayPicker 的 chips 配套）。
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
    // 截止日胶囊：和上面选项的间距，加上它在这种底色上的填充或描边。
    datePicker: string
  }
> = {
  track: {
    label: COMPOSER_MENU_LABEL_CLASS_NAME,
    body: 'px-2',
    group: 'rounded-full bg-zinc-200/60 p-[3px]',
    item: 'h-[22px]',
    itemSelected: 'bg-white',
    itemIdle: '',
    // 菜单本身是白的，胶囊没法再用白色填充，所以只描一圈边。
    datePicker:
      'mt-2 ring-1 ring-zinc-300/80 ring-inset hover:bg-zinc-200/50 hover:ring-zinc-300 data-[state=open]:bg-zinc-200/50 data-[state=open]:ring-zinc-300',
  },
  chips: {
    label: COMPOSER_PANEL_LABEL_CLASS_NAME,
    body: '',
    group: 'gap-1',
    item: 'h-7',
    itemSelected: COMPOSER_PANEL_SELECTED_CLASS_NAME,
    itemIdle: COMPOSER_PANEL_IDLE_HOVER_CLASS_NAME,
    datePicker: cn('mt-2', COMPOSER_PANEL_FIELD_CLASS_NAME),
  },
}

// 排期菜单里的「周期」一栏：这门课一共排多久；选「到某天」时多出一枚选截止日的胶囊。
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
  const dateErrorId = useId()
  const isEndDatePast = isCourseScheduleEndDatePast(value)
  const classNames = APPEARANCE_CLASS_NAMES[appearance]

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

        {value.period === 'date' && (
          <CourseScheduleEndDatePicker
            value={value.endDate}
            onValueChange={(endDate) => onValueChange({ ...value, endDate })}
            invalid={isEndDatePast}
            aria-describedby={isEndDatePast ? dateErrorId : undefined}
            className={classNames.datePicker}
          />
        )}
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
