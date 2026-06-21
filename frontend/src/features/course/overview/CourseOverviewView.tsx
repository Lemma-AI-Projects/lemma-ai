import { Button } from '@/components/ui/button'
import { CourseContentLayout } from '@/features/course/CourseContentLayout'
import type { CourseOverviewContent } from '@/features/course/CourseMainContent'
import { useChapterOverview } from '../useChapterOverview'
import { CourseOverviewMarkdown } from './CourseOverviewMarkdown'

interface CourseOverviewViewProps {
  content: CourseOverviewContent
}

function getCurrentOverviewId(content: CourseOverviewContent): string {
  if (content.scope === 'unit') {
    return `${content.unit.id}-overview`
  }

  return content.chapter ? `${content.chapter.id}-overview` : ''
}

/**
 * Chapter overview body: fast-read the cache, else stream live generation
 * (preparing -> Markdown deltas -> ready). Unit overviews have no backend yet,
 * so they keep the static (placeholder) path in CourseOverviewView.
 */
function ChapterOverviewBody({
  courseId,
  chapterId,
}: {
  courseId: string
  chapterId: string
}) {
  const { phase, markdown, errorMessage, retry } = useChapterOverview(
    courseId,
    chapterId
  )

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-start gap-3 py-10">
        <p className="text-sm text-zinc-400">{errorMessage ?? '生成概述失败'}</p>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="rounded-full bg-transparent"
          onClick={retry}
        >
          重试
        </Button>
      </div>
    )
  }

  if (markdown.length === 0 && (phase === 'loading' || phase === 'preparing')) {
    return (
      <p className="animate-pulse py-10 text-sm text-zinc-400">
        {phase === 'preparing' ? '正在准备本章视频…' : '加载概述…'}
      </p>
    )
  }

  return (
    <CourseOverviewMarkdown isStreaming={phase === 'streaming'}>
      {markdown}
    </CourseOverviewMarkdown>
  )
}

export function CourseOverviewView({ content }: CourseOverviewViewProps) {
  const chapter = content.scope === 'chapter' ? content.chapter : undefined

  return (
    <CourseContentLayout
      course={content.course}
      currentContentId={getCurrentOverviewId(content)}
      title="概述"
    >
      {chapter ? (
        <ChapterOverviewBody courseId={content.course.id} chapterId={chapter.id} />
      ) : (
        <CourseOverviewMarkdown>{content.data.markdown}</CourseOverviewMarkdown>
      )}
    </CourseContentLayout>
  )
}
