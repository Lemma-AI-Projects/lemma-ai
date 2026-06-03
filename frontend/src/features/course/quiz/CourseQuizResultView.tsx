import { CourseContentLayout } from '@/features/course/CourseContentLayout'
import type { CourseQuestionFlowContent } from '@/features/course/CourseMainContent'
import { CourseQuizInstructionsMarkdown } from '@/features/course/quiz/CourseQuizInstructionsMarkdown'

interface CourseQuizResultViewProps {
  content: CourseQuestionFlowContent
  currentContentId: string
  title?: string
}

export function CourseQuizResultView({
  content,
  currentContentId,
  title = '测验结果',
}: CourseQuizResultViewProps) {
  return (
    <CourseContentLayout
      course={content.course}
      currentContentId={currentContentId}
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
