import { useId } from 'react'

import { cn } from '@/lib/utils'

// [sandbox] 调试页顶栏里的一组候选样式切换：一句说明加一排单选。
export function SandboxVariantSwitch<Value extends string>({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string
  onValueChange: (value: Value) => void
  options: { value: Value; label: string }[]
  value: Value
}) {
  const labelId = useId()

  return (
    <div className="flex items-center gap-2">
      <span id={labelId} className="text-xs text-zinc-500">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex rounded-full bg-zinc-200/60 p-0.5"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs transition-colors',
              value === option.value
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
