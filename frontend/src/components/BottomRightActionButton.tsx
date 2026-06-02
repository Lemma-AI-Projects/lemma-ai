import type { ComponentProps, ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BottomRightActionButtonProps
  extends ComponentProps<typeof Button> {
  children: ReactNode
  contentClassName?: string
  footerClassName?: string
}

// 按钮所在底部区域的位置由这里控制，调用方可通过 footerClassName 微调。
const bottomRightActionFooterClassName =
  'pointer-events-none absolute inset-x-0 bottom-0 z-10 px-10 pb-5 pt-4'

// 按钮右对齐区域的宽度、位置由这里控制，调用方可通过 contentClassName 微调。
const bottomRightActionContentClassName =
  'relative left-1/2 flex w-full max-w-[650px] -translate-x-1/2 justify-end'

// 按钮尺寸、圆角、激活/禁用样式由这里控制。
const bottomRightActionButtonClassName =
  'pointer-events-auto h-10 rounded-full px-5 font-normal transition-colors'
const bottomRightActionButtonEnabledClassName =
  'bg-zinc-900 text-white hover:bg-zinc-800'
const bottomRightActionButtonDisabledClassName =
  'cursor-default bg-zinc-200 text-zinc-400 hover:bg-zinc-200'

export function BottomRightActionButton({
  children,
  className,
  contentClassName,
  disabled,
  footerClassName,
  ...props
}: BottomRightActionButtonProps) {
  return (
    <footer className={cn(bottomRightActionFooterClassName, footerClassName)}>
      <div className={cn(bottomRightActionContentClassName, contentClassName)}>
        <Button
          disabled={disabled}
          className={cn(
            bottomRightActionButtonClassName,
            disabled
              ? bottomRightActionButtonDisabledClassName
              : bottomRightActionButtonEnabledClassName,
            className
          )}
          {...props}
        >
          {children}
        </Button>
      </div>
    </footer>
  )
}
