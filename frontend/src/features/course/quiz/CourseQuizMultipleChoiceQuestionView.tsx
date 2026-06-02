import { CourseQuizChoiceQuestionView } from '@/features/course/quiz/CourseQuizChoiceQuestionView'
import type { CourseQuizQuestionViewProps } from '@/features/course/quiz/courseQuizQuestionViewMap'

export function CourseQuizMultipleChoiceQuestionView(
  props: CourseQuizQuestionViewProps
) {
  return (
    <CourseQuizChoiceQuestionView
      {...props}
      mode="multiple"
      title="多选题"
    />
  )
}
