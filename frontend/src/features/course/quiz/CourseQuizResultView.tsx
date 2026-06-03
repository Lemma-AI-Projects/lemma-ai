import { CourseContentLayout } from '@/features/course/CourseContentLayout'
import type { CourseQuizContent } from '@/features/course/CourseMainContent'
import { CourseQuizInstructionsMarkdown } from '@/features/course/quiz/CourseQuizInstructionsMarkdown'

interface CourseQuizResultViewProps {
  content: CourseQuizContent
  currentContentId: string
}

export function CourseQuizResultView({
  content,
  currentContentId,
}: CourseQuizResultViewProps) {
  return (
    <CourseContentLayout
      course={content.course}
      currentContentId={currentContentId}
      title="测验结果"
      titleAlign="center"
      contentClassName="max-w-[560px]"
    >
      <CourseQuizInstructionsMarkdown>
        {content.data.copy.resultMarkdown ?? ''}
      </CourseQuizInstructionsMarkdown>
    </CourseContentLayout>
  )
}
