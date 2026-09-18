import { Button } from '@/components/ui/button'
import { CourseContentLayout } from '@/features/course/CourseContentLayout'
import { CourseQuizInstructionsMarkdown } from '@/features/course/quiz/CourseQuizInstructionsMarkdown'
import type { CourseQuestionFlowContent } from '@/features/course/quiz/types'

interface CourseQuizInstructionsViewProps {
  content: CourseQuestionFlowContent
  onSkip?: () => void
  onStart: () => void
  title?: string
}

function getQuizInstructionsMarkdown(content: CourseQuestionFlowContent): string {
  return `${content.data.copy.instructions}

${content.data.copy.rules}`
}

export function CourseQuizInstructionsView({
  content,
  onSkip,
  onStart,
  title = '测验',
}: CourseQuizInstructionsViewProps) {
  return (
    <CourseContentLayout
      title={title}
      titleAlign="center"
      showFooter={false}
      contentClassName="max-w-[560px]"
    >
      <CourseQuizInstructionsMarkdown>
        {getQuizInstructionsMarkdown(content)}
      </CourseQuizInstructionsMarkdown>
      <div className="mt-10 flex justify-end gap-3">
        {onSkip ? (
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            className="h-9 rounded-full border-zinc-300 bg-transparent px-4 font-normal text-zinc-700 hover:bg-accent hover:text-accent-foreground"
          >
            跳过
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
