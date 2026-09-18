import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CourseContentLayoutProps {
  title: string
  children: ReactNode
  /** 底部「下一项」的目标；省略则不渲染页脚按钮。 */
  nextHref?: string
  nextLabel?: string
  showFooter?: boolean
  titleAlign?: 'left' | 'center'
  contentClassName?: string
}

export function CourseContentLayout({
  title,
  children,
  nextHref,
  nextLabel = '下一项',
  showFooter = true,
  titleAlign = 'left',
  contentClassName,
}: CourseContentLayoutProps) {
  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-zinc-50">
      <div
        className={cn(
          'scrollbar-fade h-full min-h-0 overflow-y-auto px-10 pt-14',
          showFooter ? 'pb-32' : 'pb-14'
        )}
      >
        <article className={cn('mx-auto w-full max-w-[700px]', contentClassName)}>
          <h1
            className={cn(
              'text-[32px] font-semibold leading-10 tracking-tight text-zinc-950',
              titleAlign === 'center' && 'text-center'
            )}
          >
            {title}
          </h1>
          <div className="mt-6 h-px w-full bg-zinc-200" />
          <div className="mt-8">{children}</div>
        </article>
      </div>

      {showFooter ? (
        <footer className="absolute inset-x-0 bottom-0 z-10 px-10 pb-5 pt-4">
          <div className="absolute inset-x-0 -top-1 bottom-0 bg-zinc-50" />
          <div className="absolute left-1/2 -top-1 h-px w-full max-w-[700px] -translate-x-1/2 bg-zinc-200" />
          <div className="relative left-1/2 flex w-full max-w-[700px] -translate-x-1/2 justify-end">
            {nextHref ? (
              <Button
                asChild
                variant="outline"
                className="h-9 rounded-full border-zinc-300 bg-transparent px-4 font-normal text-zinc-700 hover:bg-accent hover:text-accent-foreground"
              >
                <a href={nextHref}>{nextLabel}</a>
              </Button>
            ) : null}
          </div>
        </footer>
      ) : null}
    </div>
  )
}
