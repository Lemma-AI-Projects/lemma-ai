import type * as React from 'react'
import { CheckIcon, MinusIcon } from 'lucide-react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * 勾选框。三态（选中 / 半选 / 未选）由 Radix 的 `checked="indeterminate"` 驱动：
 * 它会把 `data-state="indeterminate"` 挂到根节点上，图标靠 `group-data-*` 切换 ——
 * 半选必须是**看得见的第三种状态**，否则「文件夹里只选了一部分」这件事在界面上就丢了。
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'group peer size-4 shrink-0 rounded-[4px] border border-zinc-300 bg-background outline-none transition-colors',
        'focus-visible:border-zinc-400 focus-visible:ring-[3px] focus-visible:ring-foreground/10',
        'data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background',
        'data-[state=indeterminate]:border-foreground data-[state=indeterminate]:bg-foreground data-[state=indeterminate]:text-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <CheckIcon
          className="size-3 group-data-[state=indeterminate]:hidden"
          strokeWidth={3.5}
        />
        <MinusIcon
          className="hidden size-3 group-data-[state=indeterminate]:block"
          strokeWidth={3.5}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
