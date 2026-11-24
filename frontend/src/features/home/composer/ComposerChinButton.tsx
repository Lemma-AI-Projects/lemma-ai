import { type ComponentProps } from 'react'
import { type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

// 输入框下巴里的胶囊按钮：图标 + 一句话状态，尺寸和配色沿用现有首页下巴按钮。
// 设置改动后只换文字，不加额外高亮；底色只在悬停和菜单打开时出现。
export function ComposerChinButton({
  children,
  className,
  icon: Icon,
  ...props
}: ComponentProps<'button'> & {
  icon: LucideIcon
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-7 max-w-full shrink-0 -translate-y-px items-center gap-1.5 rounded-full px-2.5 text-[14px] leading-5 font-normal text-zinc-700 outline-none transition-colors',
        'hover:bg-black/[0.05] hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-300',
        'data-[state=open]:bg-black/[0.08] data-[state=open]:text-zinc-950',
        className
      )}
      {...props}
    >
      <Icon className="size-[16.5px] shrink-0" />
      <span className="truncate">{children}</span>
    </button>
  )
}
