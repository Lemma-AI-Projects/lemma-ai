import { CourseContentLayout } from '@/features/course/CourseContentLayout'
import { CourseQuizInstructionsMarkdown } from '@/features/course/quiz/CourseQuizInstructionsMarkdown'
import type { CourseQuestionFlowContent } from '@/features/course/quiz/types'

interface CourseQuizResultViewProps {
  content: CourseQuestionFlowContent
  title?: string
}

export function CourseQuizResultView({
  content,
  title = '测验结果',
}: CourseQuizResultViewProps) {
  return (
    <CourseContentLayout
      title={title}
      titleAlign="center"
      contentClassName="max-w-[560px]"
    >
      <CourseQuizInstructionsMarkdown>
        {content.data.copy.resultMarkdown ?? ''}
      </CourseQuizInstructionsMarkdown>
    </CourseContentLayout>
  )
}
