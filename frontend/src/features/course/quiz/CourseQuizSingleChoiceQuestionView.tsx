import { CourseQuizChoiceQuestionView } from '@/features/course/quiz/CourseQuizChoiceQuestionView'
import type { CourseQuizQuestionViewProps } from '@/features/course/quiz/courseQuizQuestionViewMap'

export function CourseQuizSingleChoiceQuestionView(
  props: CourseQuizQuestionViewProps
) {
  return (
    <CourseQuizChoiceQuestionView
      {...props}
      mode="single"
      title="单选题"
    />
  )
}
