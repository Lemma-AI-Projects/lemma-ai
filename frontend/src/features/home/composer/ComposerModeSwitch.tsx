import { GraduationCap, MessageCircle, type LucideIcon } from 'lucide-react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

export type ComposerMode = 'course' | 'chat'

const COMPOSER_MODE_OPTIONS: {
  value: ComposerMode
  label: string
  Icon: LucideIcon
}[] = [
  { value: 'course', label: '自由课程', Icon: GraduationCap },
  { value: 'chat', label: '随便聊聊', Icon: MessageCircle },
]

// 输入框右上角的模式切换：两个模式的文字始终可见，白色滑块指示当前模式。
export function ComposerModeSwitch({
  className,
  onValueChange,
  value,
}: {
  className?: string
  onValueChange: (value: ComposerMode) => void
  value: ComposerMode
}) {
  return (
    <ToggleGroup
      type="single"
      spacing={0}
      value={value}
      onValueChange={(next) => {
        if (next === 'course' || next === 'chat') {
          onValueChange(next)
        }
      }}
      aria-label="对话模式"
      className={cn(
        'relative grid h-8 grid-cols-2 gap-0 rounded-full bg-zinc-200/60 p-[3px]',
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-white transition-transform duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          value === 'chat' && 'translate-x-full'
        )}
      />
      {COMPOSER_MODE_OPTIONS.map(({ Icon, label, value: mode }) => (
        <ToggleGroupItem
          key={mode}
          value={mode}
          className="relative z-10 h-[26px] gap-1.5 bg-transparent px-2.5 text-[13.5px] font-medium text-zinc-500 shadow-none transition-colors duration-200 hover:bg-transparent hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-300 data-[spacing=0]:rounded-full data-[spacing=0]:first:rounded-full data-[spacing=0]:last:rounded-full data-[state=on]:bg-transparent data-[state=on]:text-zinc-950"
        >
          <Icon className="size-4" />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
