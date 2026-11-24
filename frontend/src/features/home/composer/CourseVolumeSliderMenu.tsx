import { Layers } from 'lucide-react'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { ComposerChinButton } from '@/features/home/composer/ComposerChinButton'
import { COMPOSER_MENU_LABEL_CLASS_NAME } from '@/features/home/composer/composerMenuStyles'
import {
  COURSE_VOLUME_OPTIONS,
  courseVolumeSummary,
  type CourseVolume,
} from '@/features/home/composer/courseVolume'
import { cn } from '@/lib/utils'

// 档位文字与滑块停靠点对齐：首尾贴边，中间居中。
const TICK_ALIGN_CLASS_NAMES = ['text-left', 'text-center', 'text-right']

// 课程体量入口（滑杆菜单）：点开后三档滑杆，档位文字也可以直接点。
export function CourseVolumeSliderMenu({
  onValueChange,
  value,
}: {
  onValueChange: (value: CourseVolume) => void
  value: CourseVolume
}) {
  const index = COURSE_VOLUME_OPTIONS.findIndex((item) => item.value === value)

  const selectIndex = (nextIndex: number) => {
    const option = COURSE_VOLUME_OPTIONS[nextIndex]
    if (option) {
      onValueChange(option.value)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ComposerChinButton icon={Layers}>
          {courseVolumeSummary(value)}
        </ComposerChinButton>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={7}
        aria-label="课程体量"
        className="w-48 rounded-lg p-1 shadow-none"
      >
        <p className={COMPOSER_MENU_LABEL_CLASS_NAME}>课程体量</p>
        <div className="px-2 pt-2 pb-1.5">
          <Slider
            aria-label="课程体量"
            aria-valuetext={COURSE_VOLUME_OPTIONS[index]?.label}
            min={0}
            max={COURSE_VOLUME_OPTIONS.length - 1}
            step={1}
            value={[index]}
            onValueChange={([nextIndex]) => selectIndex(nextIndex)}
          />
          <div className="mt-2 grid grid-cols-3">
            {COURSE_VOLUME_OPTIONS.map((option, optionIndex) => (
              <button
                key={option.value}
                type="button"
                tabIndex={-1}
                onClick={() => selectIndex(optionIndex)}
                className={cn(
                  'text-xs leading-5 transition-colors',
                  TICK_ALIGN_CLASS_NAMES[optionIndex],
                  optionIndex === index
                    ? 'font-medium text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-800'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
