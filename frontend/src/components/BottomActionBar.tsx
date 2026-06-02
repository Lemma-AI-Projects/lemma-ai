import type { ComponentProps, ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type BottomActionBarButtonTone = 'primary' | 'light'

interface BottomActionBarProps {
  contentClassName?: string
  footerClassName?: string
  left?: ReactNode
  right?: ReactNode
}

interface BottomActionBarButtonProps
  extends ComponentProps<typeof Button> {
  tone?: BottomActionBarButtonTone
}

// 底部操作栏的位置由这里控制，调用方可通过 footerClassName 微调。
const bottomActionBarFooterClassName =
  'pointer-events-none absolute inset-x-0 bottom-0 z-10 px-10 pb-5 pt-4'

// 底部操作栏的内容宽度、左右对齐由这里控制，调用方可通过 contentClassName 微调。
const bottomActionBarContentClassName =
  'relative left-1/2 flex w-full max-w-[650px] -translate-x-1/2 items-center justify-between'

const bottomActionBarSideClassName =
  'pointer-events-auto flex items-center gap-3'

// 底部操作按钮尺寸、圆角由这里控制。
const bottomActionBarButtonClassName =
  'h-10 rounded-full px-5 font-normal transition-colors'
const bottomActionBarButtonPrimaryClassName =
  'bg-zinc-900 text-white hover:bg-zinc-800 disabled:cursor-default disabled:bg-zinc-200 disabled:text-zinc-400 disabled:hover:bg-zinc-200'
const bottomActionBarButtonLightClassName =
  'border-zinc-300 bg-transparent text-zinc-700 hover:bg-accent hover:text-accent-foreground disabled:cursor-default disabled:border-zinc-200 disabled:text-zinc-400 disabled:hover:bg-transparent'

export function BottomActionBar({
  contentClassName,
  footerClassName,
  left,
  right,
}: BottomActionBarProps) {
  return (
    <footer className={cn(bottomActionBarFooterClassName, footerClassName)}>
      <div className={cn(bottomActionBarContentClassName, contentClassName)}>
        <div className={bottomActionBarSideClassName}>{left}</div>
        <div className={bottomActionBarSideClassName}>{right}</div>
      </div>
    </footer>
  )
}

export function BottomActionBarButton({
  className,
  tone = 'primary',
  variant,
  ...props
}: BottomActionBarButtonProps) {
  return (
    <Button
      variant={variant ?? (tone === 'light' ? 'outline' : 'default')}
      className={cn(
        bottomActionBarButtonClassName,
        tone === 'primary'
          ? bottomActionBarButtonPrimaryClassName
          : bottomActionBarButtonLightClassName,
        className
      )}
      {...props}
    />
  )
}
