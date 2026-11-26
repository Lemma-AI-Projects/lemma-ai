import { Folder } from 'lucide-react'

import {
  InputMenu,
  InputMenuRadioGroup,
  InputMenuRadioItem,
} from '@/components/InputMenu'
import { ComposerChinButton } from '@/features/home/composer/ComposerChinButton'

export interface ComposerSpace {
  id: string
  name: string
}

// 单选组里代表「不放入任何空间」的值。
const NO_SPACE_VALUE = ''

// 学习空间入口：选择这门课要放进哪个空间，默认不放入。
export function CourseSpaceMenu({
  onValueChange,
  spaces,
  value,
}: {
  onValueChange: (spaceId: string | null) => void
  spaces: ComposerSpace[]
  value: string | null
}) {
  const selected = spaces.find((space) => space.id === value)

  return (
    <InputMenu
      align="start"
      side="bottom"
      sideOffset={7}
      contentClassName="w-48 min-w-0 rounded-lg"
      trigger={
        <ComposerChinButton icon={Folder}>
          {selected?.name ?? '不放入空间'}
        </ComposerChinButton>
      }
    >
      {/* 不加标题：胶囊上已经写了「空间」，菜单里只放选项。 */}
      <InputMenuRadioGroup
        aria-label="学习空间"
        value={selected?.id ?? NO_SPACE_VALUE}
        onValueChange={(next) =>
          onValueChange(next === NO_SPACE_VALUE ? null : next)
        }
      >
        <InputMenuRadioItem value={NO_SPACE_VALUE}>不放入</InputMenuRadioItem>
        {spaces.map((space) => (
          <InputMenuRadioItem key={space.id} value={space.id}>
            {space.name}
          </InputMenuRadioItem>
        ))}
      </InputMenuRadioGroup>
    </InputMenu>
  )
}
