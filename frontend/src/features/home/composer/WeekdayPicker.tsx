import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'

import {
  COMPOSER_PANEL_IDLE_HOVER_CLASS_NAME,
  COMPOSER_PANEL_SELECTED_CLASS_NAME,
} from '@/features/home/composer/composerMenuStyles'
import {
  WEEKDAY_OPTIONS,
  type Weekday,
} from '@/features/home/composer/courseSchedule'
import { cn } from '@/lib/utils'

// - dots：七个独立的圆点，选中的垫一层浅灰；
// - bar：七格连成一条浅灰轨道，选中的格子变白，相邻的选中日连成一段（与模式切换同一种做法）；
// - chips：放在面板里用，七个等宽的圆片，选中的变成白片。
export type WeekdayPickerAppearance = 'dots' | 'bar' | 'chips'

const ROOT_CLASS_NAME: Record<WeekdayPickerAppearance, string> = {
  dots: 'justify-between',
  bar: 'rounded-full bg-zinc-200/60 p-[3px]',
  chips: 'gap-1',
}

// 一周七天的多选：点一下某天就选中或取消。选中态只用浅底加深色字，不用实心黑底。
export function WeekdayPicker({
  appearance = 'dots',
  'aria-label': ariaLabel = '每周学习日',
  'aria-labelledby': ariaLabelledBy,
  onValueChange,
  value,
}: {
  appearance?: WeekdayPickerAppearance
  'aria-label'?: string
  'aria-labelledby'?: string
  onValueChange: (value: Weekday[]) => void
  value: Weekday[]
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="multiple"
      value={value.map(String)}
      onValueChange={(next) =>
        onValueChange(
          WEEKDAY_OPTIONS.filter((option) => next.includes(String(option.value))).map(
            (option) => option.value
          )
        )
      }
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn('flex w-full items-center', ROOT_CLASS_NAME[appearance])}
    >
      {WEEKDAY_OPTIONS.map((option, index) => {
        const selected = value.includes(option.value)
        const previous = WEEKDAY_OPTIONS[index - 1]
        const next = WEEKDAY_OPTIONS[index + 1]
        const startsRun = !previous || !value.includes(previous.value)
        const endsRun = !next || !value.includes(next.value)

        return (
          <ToggleGroupPrimitive.Item
            key={option.value}
            value={String(option.value)}
            aria-label={option.label}
            className={cn(
              'inline-flex items-center justify-center text-[13px] leading-none outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-zinc-300',
              selected ? 'font-medium text-zinc-950' : 'text-zinc-500 hover:text-zinc-900',
              appearance === 'dots' &&
                cn(
                  'size-[26px] rounded-full',
                  selected ? 'bg-zinc-200/70' : 'hover:bg-zinc-100'
                ),
              appearance === 'bar' &&
                cn(
                  'h-[26px] min-w-0 flex-1',
                  selected && 'bg-white',
                  selected && startsRun && 'rounded-l-full',
                  selected && endsRun && 'rounded-r-full'
                ),
              appearance === 'chips' &&
                cn(
                  'h-7 min-w-0 flex-1 rounded-full',
                  selected
                    ? COMPOSER_PANEL_SELECTED_CLASS_NAME
                    : COMPOSER_PANEL_IDLE_HOVER_CLASS_NAME
                )
            )}
          >
            {option.short}
          </ToggleGroupPrimitive.Item>
        )
      })}
    </ToggleGroupPrimitive.Root>
  )
}
