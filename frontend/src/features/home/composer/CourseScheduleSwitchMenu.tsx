import { useId, useState } from 'react'
import { CalendarDays } from 'lucide-react'

import { AnimatedHeight } from '@/components/AnimatedHeight'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { ComposerChinButton } from '@/features/home/composer/ComposerChinButton'
import {
  COMPOSER_MENU_ROW_CLASS_NAME,
  COMPOSER_PANEL_CLASS_NAME,
  COMPOSER_PANEL_LABEL_CLASS_NAME,
} from '@/features/home/composer/composerMenuStyles'
import { CourseSchedulePeriodField } from '@/features/home/composer/CourseSchedulePeriodField'
import {
  EVERY_WEEKDAY,
  courseScheduleMenuLayoutKey,
  courseScheduleSummary,
  isCourseScheduled,
  type CourseSchedule,
  type Weekday,
} from '@/features/home/composer/courseSchedule'
import { WeekdayPicker } from '@/features/home/composer/WeekdayPicker'
import { cn } from '@/lib/utils'

// 展开区的固定宽度 = 展开后的菜单宽度（248px）减去两侧边框和内边距（共 10px）。
// 宽度写死是为了让菜单变宽的过程中内容不跟着重排，只是被逐渐露出来。
const EXPANDED_AREA_WIDTH_CLASS_NAME = 'w-[238px]'

// 排期入口（开关展开）：先只有一个「排进日程」开关，打开后菜单变宽，露出学习日和周期。
// 学习日和周期收在开关下方的一块浅灰面板里：靠底色表示「这一块归开关管」，不用分割线。
export function CourseScheduleSwitchMenu({
  onValueChange,
  value,
}: {
  onValueChange: (value: CourseSchedule) => void
  value: CourseSchedule
}) {
  const switchId = useId()
  const weekdaysLabelId = useId()
  // 关掉开关前选过的日子，再打开时恢复；第一次打开默认每天。
  const [remembered, setRemembered] = useState<Weekday[]>(EVERY_WEEKDAY)
  const enabled = isCourseScheduled(value)

  const handleCheckedChange = (checked: boolean) => {
    if (checked) {
      onValueChange({ ...value, weekdays: remembered })
      return
    }
    setRemembered(value.weekdays)
    onValueChange({ ...value, weekdays: [] })
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
          enabled ? 'w-[248px]' : 'w-40'
        )}
      >
        <AnimatedHeight animateKey={courseScheduleMenuLayoutKey(value)}>
          {/* 整行都能点：和其它菜单项一样，悬停时整行垫一层底色。 */}
          <label htmlFor={switchId} className={COMPOSER_MENU_ROW_CLASS_NAME}>
            <span className="flex-1 truncate">排进日程</span>
            <Switch
              id={switchId}
              size="sm"
              checked={enabled}
              onCheckedChange={handleCheckedChange}
              className="shadow-none"
            />
          </label>

          {enabled && (
            <div className={cn(EXPANDED_AREA_WIDTH_CLASS_NAME, 'pt-1')}>
              <div className={cn(COMPOSER_PANEL_CLASS_NAME, 'space-y-3 px-2 pt-2 pb-2.5')}>
                <div>
                  <p id={weekdaysLabelId} className={COMPOSER_PANEL_LABEL_CLASS_NAME}>
                    学习日
                  </p>
                  <WeekdayPicker
                    appearance="chips"
                    aria-labelledby={weekdaysLabelId}
                    value={value.weekdays}
                    onValueChange={(weekdays) => onValueChange({ ...value, weekdays })}
                  />
                </div>
                <CourseSchedulePeriodField
                  appearance="chips"
                  value={value}
                  onValueChange={onValueChange}
                />
              </div>
            </div>
          )}
        </AnimatedHeight>
      </PopoverContent>
    </Popover>
  )
}
