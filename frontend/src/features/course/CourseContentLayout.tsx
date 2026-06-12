import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { getNextCourseDirectoryHref } from '@/features/course/getNextCourseDirectoryHref'
import { cn } from '@/lib/utils'
import type { CourseItem } from '@/mock/course/courseItems'

interface CourseContentLayoutProps {
  course: CourseItem
  currentContentId: string
  title: string
  children: ReactNode
  showFooter?: boolean
  titleAlign?: 'left' | 'center'
  contentClassName?: string
}

export function CourseContentLayout({
  course,
  currentContentId,
  title,
  children,
  showFooter = true,
  titleAlign = 'left',
  contentClassName,
}: CourseContentLayoutProps) {
  const nextContentHref = getNextCourseDirectoryHref(course, currentContentId)

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
            {nextContentHref ? (
              <Button
                asChild
                variant="outline"
                className="h-9 rounded-full border-zinc-300 bg-transparent px-4 font-normal text-zinc-700 hover:bg-accent hover:text-accent-foreground"
              >
                <a href={nextContentHref}>下一章</a>
              </Button>
            ) : null}
          </div>
        </footer>
      ) : null}
    </div>
  )
}
