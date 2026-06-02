import type { CourseQuizContent } from '@/features/course/CourseMainContent'
import { courseQuizQuestionViewMap } from '@/features/course/quiz/courseQuizQuestionViewMap'
import type { CourseQuizQuestionType } from '@/mock/course/courseItems'

interface CourseQuizQuestionsViewProps {
  content: CourseQuizContent
  currentContentId: string
}

function getCurrentQuestionType(
  content: CourseQuizContent,
  questionIndex: number
): CourseQuizQuestionType {
  return content.data.questions[questionIndex]?.type ?? 'single-choice'
}

export function CourseQuizQuestionsView({
  content,
  currentContentId,
}: CourseQuizQuestionsViewProps) {
  const questionIndex = 0
  const question = content.data.questions[questionIndex]
  const QuestionView = courseQuizQuestionViewMap[
    getCurrentQuestionType(content, questionIndex)
  ]

  return (
    <QuestionView
      content={content}
      currentContentId={currentContentId}
      question={question}
      questionIndex={questionIndex}
    />
  )
}
