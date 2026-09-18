import { CourseContentLayout } from '@/features/course/CourseContentLayout'
import { CourseQuizInstructionsMarkdown } from '@/features/course/quiz/CourseQuizInstructionsMarkdown'
import type { CourseQuestionFlowContent } from '@/features/course/quiz/types'

interface CourseQuizResultViewProps {
  content: CourseQuestionFlowContent
  nextHref?: string
  title?: string
}

export function CourseQuizResultView({
  content,
  nextHref,
  title = '测验结果',
}: CourseQuizResultViewProps) {
  return (
    <CourseContentLayout
      title={title}
      titleAlign="center"
      contentClassName="max-w-[560px]"
      nextHref={nextHref}
      nextLabel="下一章"
    >
      <CourseQuizInstructionsMarkdown>
        {content.data.copy.resultMarkdown ?? ''}
      </CourseQuizInstructionsMarkdown>
    </CourseContentLayout>
  )
}
