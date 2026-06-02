import { Button } from '@/components/ui/button'
import {
  CourseContentLayout,
  getNextCourseDirectoryHref,
} from '@/features/course/CourseContentLayout'
import type { CourseQuizContent } from '@/features/course/CourseMainContent'
import { CourseQuizInstructionsMarkdown } from '@/features/course/quiz/CourseQuizInstructionsMarkdown'

interface CourseQuizInstructionsViewProps {
  content: CourseQuizContent
  currentContentId: string
  onStart: () => void
}

function getQuizInstructionsMarkdown(content: CourseQuizContent): string {
  return `${content.data.copy.instructions}

${content.data.copy.rules}`
}

export function CourseQuizInstructionsView({
  content,
  currentContentId,
  onStart,
}: CourseQuizInstructionsViewProps) {
  const skipHref = getNextCourseDirectoryHref(content.course, currentContentId)

  return (
    <CourseContentLayout
      course={content.course}
      currentContentId={currentContentId}
      title="测验"
      titleAlign="center"
      showFooter={false}
      contentClassName="max-w-[560px]"
    >
      <CourseQuizInstructionsMarkdown>
        {getQuizInstructionsMarkdown(content)}
      </CourseQuizInstructionsMarkdown>
      <div className="mt-10 flex justify-end gap-3">
        {skipHref ? (
          <Button
            asChild
            variant="outline"
            className="h-9 rounded-full border-zinc-300 bg-transparent px-4 font-normal text-zinc-700 hover:bg-accent hover:text-accent-foreground"
          >
            <a href={skipHref}>跳过</a>
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={onStart}
          className="h-9 rounded-full bg-zinc-950 px-4 font-normal text-white hover:bg-zinc-800"
        >
          开始
        </Button>
      </div>
    </CourseContentLayout>
  )
}
