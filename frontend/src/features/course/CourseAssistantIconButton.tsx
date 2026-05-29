import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CourseAssistantIconButtonTone = 'outline' | 'send'

interface CourseAssistantIconButtonProps extends ComponentProps<'button'> {
  children: ReactNode
  tone: CourseAssistantIconButtonTone
}

export function CourseAssistantIconButton({
  children,
  className,
  tone,
  type = 'button',
  ref,
  ...props
}: CourseAssistantIconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex size-[30px] shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        tone === 'outline' &&
          'border border-zinc-200 bg-background hover:bg-accent hover:text-accent-foreground',
        tone === 'send' && 'text-white',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
