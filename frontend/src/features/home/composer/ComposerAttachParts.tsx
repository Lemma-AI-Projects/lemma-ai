import { type ComponentProps, type ReactNode } from 'react'
import { Check, Plus } from 'lucide-react'

import {
  COMPOSER_LIBRARY_KIND_ICONS,
  type ComposerAttachment,
} from '@/features/home/composer/composerAttachments'
import { COMPOSER_MENU_ROW_CLASS_NAME } from '@/features/home/composer/composerMenuStyles'
import { categoryToIconMap, getFileCategory } from '@/lib/fileType'
import { cn } from '@/lib/utils'

// 一份资料前面的图标：平台资料按来源，本地文件按扩展名。
export function ComposerAttachmentIcon({
  attachment,
  className,
}: {
  attachment: ComposerAttachment
  className?: string
}) {
  const Icon =
    attachment.kind === 'file'
      ? categoryToIconMap[getFileCategory(attachment.title)]
      : COMPOSER_LIBRARY_KIND_ICONS[attachment.kind]

  return <Icon className={className} />
}

// 输入框左下角的圆形加号。菜单打开时（data-state="open"）加号转成一个叉。
export function ComposerAttachTrigger({
  className,
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-label="附上参考资料"
      {...props}
      className={cn(
        'group inline-flex size-[33px] shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-background outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-zinc-300 data-[state=open]:bg-accent',
        className
      )}
    >
      <Plus className="size-[18px] text-zinc-500 transition-transform duration-200 ease-out group-data-[state=open]:rotate-45 motion-reduce:transition-none" />
    </button>
  )
}

// 菜单里的一份资料：点一下附上，再点一下取消；已经附上的右边有一个对勾。
// - `showIcon`：不同来源的资料混在一个列表里时，用图标区分来源；
// - `active`：键盘选中的那一行。
export function ComposerAttachItemRow({
  active = false,
  attached,
  attachment,
  className,
  showIcon = false,
  ...props
}: ComponentProps<'button'> & {
  active?: boolean
  attached: boolean
  attachment: ComposerAttachment
  showIcon?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={attached}
      {...props}
      className={cn(COMPOSER_MENU_ROW_CLASS_NAME, active && 'bg-accent', className)}
    >
      {showIcon && (
        <ComposerAttachmentIcon
          attachment={attachment}
          className="size-4 shrink-0 text-zinc-500"
        />
      )}
      <span className="min-w-0 flex-1 truncate text-left">{attachment.title}</span>
      {attached && <Check className="size-4 shrink-0 text-foreground" />}
    </button>
  )
}

// 某个来源下还没有任何资料时的一行说明。
export function ComposerAttachEmptyRow() {
  return (
    <p className="px-2 py-1.5 text-[14px] leading-5 text-zinc-500">这里还没有内容</p>
  )
}

// 可以上下滚动的一栏，不显示滚动条；高度由 `className` 给（固定高度或最大高度都行）。
// 调用方把高度定成「整数行加半行」，最后露出的半行就是「下面还有」的提示。
export function ComposerAttachScrollArea({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      // overscroll-contain：滚到头之后不会带着外面的页面一起滚。
      className={cn('scrollbar-hidden overflow-y-auto overscroll-contain', className)}
    >
      {children}
    </div>
  )
}
