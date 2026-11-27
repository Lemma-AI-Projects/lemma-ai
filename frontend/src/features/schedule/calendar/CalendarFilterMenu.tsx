import { type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { InputMenu, InputMenuItem } from '@/components/InputMenu'
import { cn } from '@/lib/utils'

export interface CalendarFilterOption<Value> {
  value: Value
  label: string
  // 菜单里这一项前面的小图形。
  leading?: ReactNode
}

// 顶栏里的一枚筛选胶囊，点开是一列单选。
//
// - 第一项是「不筛」。停在这一项上时胶囊只有描边；选了别的，胶囊换成一层浅灰的底，
//   上面写着选中的那一项：一眼看得出日历现在是筛过的。
// - 菜单开着时，鼠标（或方向键）移到哪一项，后面的日历就先按这一项筛，
//   不用选了才知道是什么样；菜单关了，回到选定的那一项。
export function CalendarFilterMenu<Value extends string | null>({
  label,
  menuClassName,
  onPreview,
  onSelect,
  options,
  value,
}: {
  // 这枚胶囊筛的是什么，读屏用。
  label: string
  menuClassName?: string
  // 先看看某一项的效果；传 undefined 结束预览。
  onPreview: (value: Value | undefined) => void
  onSelect: (value: Value) => void
  options: CalendarFilterOption<Value>[]
  value: Value
}) {
  const selected = options.find((option) => option.value === value) ?? options[0]
  const applied = selected !== options[0]

  return (
    <InputMenu
      side="bottom"
      sideOffset={6}
      contentClassName={menuClassName}
      onOpenChange={(open) => {
        if (!open) {
          onPreview(undefined)
        }
      }}
      trigger={
        <button
          type="button"
          aria-label={`${label}: ${selected.label}`}
          className={cn(
            'inline-flex h-7 min-w-0 items-center gap-1 rounded-full pr-1.5 pl-2.5 text-[13.5px] leading-5 outline-none transition-colors ring-inset focus-visible:ring-2 focus-visible:ring-zinc-400',
            applied
              ? 'bg-black/[0.06] text-zinc-950 hover:bg-black/[0.09] data-[state=open]:bg-black/[0.09]'
              : 'text-zinc-700 ring-1 ring-zinc-200 hover:bg-black/[0.04] hover:text-zinc-950 data-[state=open]:bg-black/[0.04] data-[state=open]:text-zinc-950'
          )}
        >
          <span className="truncate">{selected.label}</span>
          <ChevronDown className="size-4 shrink-0 text-zinc-400" />
        </button>
      }
    >
      {options.map((option) => (
        // 鼠标移到一项上、或者用方向键移到一项上，这一项都会得到焦点。
        <InputMenuItem
          key={String(option.value)}
          onFocus={() => onPreview(option.value)}
          onSelect={() => onSelect(option.value)}
        >
          {option.leading}
          <span className="min-w-0 flex-1 truncate">{option.label}</span>
          {option === selected && <Check className="size-4 shrink-0" />}
        </InputMenuItem>
      ))}
    </InputMenu>
  )
}
