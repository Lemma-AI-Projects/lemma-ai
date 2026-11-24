import { Layers } from 'lucide-react'

import {
  InputMenu,
  InputMenuLabel,
  InputMenuRadioGroup,
  InputMenuRadioItem,
} from '@/components/InputMenu'
import { ComposerChinButton } from '@/features/home/composer/ComposerChinButton'
import {
  COURSE_VOLUME_OPTIONS,
  courseVolumeSummary,
  type CourseVolume,
} from '@/features/home/composer/courseVolume'

// 课程体量入口（列表菜单）：点开后三档单选。
export function CourseVolumeListMenu({
  onValueChange,
  value,
}: {
  onValueChange: (value: CourseVolume) => void
  value: CourseVolume
}) {
  return (
    <InputMenu
      align="start"
      side="bottom"
      sideOffset={7}
      contentClassName="w-40 min-w-0 rounded-lg"
      trigger={
        <ComposerChinButton icon={Layers}>
          {courseVolumeSummary(value)}
        </ComposerChinButton>
      }
    >
      <InputMenuLabel>课程体量</InputMenuLabel>
      <InputMenuRadioGroup
        value={value}
        onValueChange={(next) => {
          const option = COURSE_VOLUME_OPTIONS.find((item) => item.value === next)
          if (option) {
            onValueChange(option.value)
          }
        }}
      >
        {COURSE_VOLUME_OPTIONS.map((option) => (
          <InputMenuRadioItem key={option.value} value={option.value}>
            {option.label}
          </InputMenuRadioItem>
        ))}
      </InputMenuRadioGroup>
    </InputMenu>
  )
}
