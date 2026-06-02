import { useState } from 'react'
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
  const [questionIndex, setQuestionIndex] = useState(0)
  const question = content.data.questions[questionIndex]
  const QuestionView = courseQuizQuestionViewMap[
    getCurrentQuestionType(content, questionIndex)
  ]
  const lastQuestionIndex = Math.max(content.data.questions.length - 1, 0)

  function goToNextQuestion() {
    setQuestionIndex((currentQuestionIndex) =>
      Math.min(currentQuestionIndex + 1, lastQuestionIndex)
    )
  }

  function goToPreviousQuestion() {
    setQuestionIndex((currentQuestionIndex) =>
      Math.max(currentQuestionIndex - 1, 0)
    )
  }

  return (
    <QuestionView
      key={question?.id ?? questionIndex}
      content={content}
      currentContentId={currentContentId}
      onNextQuestion={goToNextQuestion}
      onPreviousQuestion={goToPreviousQuestion}
      question={question}
      questionIndex={questionIndex}
    />
  )
}
