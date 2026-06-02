import { Button } from '@/components/ui/button'
import type { CourseOverviewContent } from '@/features/course/CourseMainContent'
import { CourseOverviewMarkdown } from './CourseOverviewMarkdown'

interface CourseOverviewViewProps {
  content: CourseOverviewContent
}

function getCourseDirectoryOrder(content: CourseOverviewContent): string[] {
  return content.course.units.flatMap((unit) => [
    `${unit.id}-overview`,
    ...unit.chapters.flatMap((chapter) => [
      `${chapter.id}-overview`,
      `${chapter.id}-video`,
      `${chapter.id}-quiz`,
      `${chapter.id}-assignment`,
    ]),
    `${unit.id}-quiz`,
    `${unit.id}-assignment`,
  ])
}

function getCurrentOverviewId(content: CourseOverviewContent): string {
  if (content.scope === 'unit') {
    return `${content.unit.id}-overview`
  }

  return content.chapter ? `${content.chapter.id}-overview` : ''
}

function getNextCourseDirectoryHref(content: CourseOverviewContent): string | null {
  const order = getCourseDirectoryOrder(content)
  const currentId = getCurrentOverviewId(content)
  const currentIndex = order.indexOf(currentId)

  if (currentIndex < 0 || order.length === 0) {
    return null
  }

  return `#${order[(currentIndex + 1) % order.length]}`
}

export function CourseOverviewView({ content }: CourseOverviewViewProps) {
  const nextContentHref = getNextCourseDirectoryHref(content)

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-zinc-50">
      <div className="scrollbar-fade h-full min-h-0 overflow-y-auto px-10 pb-32 pt-14">
        <article className="mx-auto w-full max-w-[700px]">
          <h1 className="text-[32px] font-semibold leading-10 tracking-tight text-zinc-950">
            概述
          </h1>
          <div className="mt-6 h-px w-full bg-zinc-200" />
          <CourseOverviewMarkdown className="mt-8">
            {content.data.markdown}
          </CourseOverviewMarkdown>
        </article>
      </div>

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
    </div>
  )
}
