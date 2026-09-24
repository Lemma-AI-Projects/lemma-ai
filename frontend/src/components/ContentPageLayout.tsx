import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ContentPageLayoutProps {
  title: string
  children: ReactNode
  /** 底部「下一项」的目标；省略则不渲染该按钮。 */
  nextHref?: string
  nextLabel?: string
  /** 页脚左侧的附加操作。 */
  footerStart?: ReactNode
  showFooter?: boolean
  titleAlign?: 'left' | 'center'
  contentClassName?: string
}

/** 标题 + 分隔线 + 正文 + 可选页脚的阅读页骨架（说明页、结果页等）。 */
export function ContentPageLayout({
  title,
  children,
  nextHref,
  nextLabel = '下一项',
  footerStart,
  showFooter = true,
  titleAlign = 'left',
  contentClassName,
}: ContentPageLayoutProps) {
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
          <div className="relative left-1/2 flex w-full max-w-[700px] -translate-x-1/2 items-center justify-between gap-3">
            <div className="flex items-center gap-3">{footerStart}</div>
            {nextHref ? (
              <Button
                asChild
                variant="outline"
                className="h-9 rounded-full border-zinc-300 bg-transparent px-4 font-normal text-zinc-700 hover:bg-accent hover:text-accent-foreground"
              >
                <Link to={nextHref}>{nextLabel}</Link>
              </Button>
            ) : null}
          </div>
        </footer>
      ) : null}
    </div>
  )
}
