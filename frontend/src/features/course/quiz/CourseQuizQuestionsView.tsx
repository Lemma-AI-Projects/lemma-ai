import { useState } from 'react'
import type { CourseQuestionFlowContent } from '@/features/course/CourseMainContent'
import {
  courseQuizQuestionViewMap,
  type CourseQuizQuestionAnswerValue,
} from '@/features/course/quiz/courseQuizQuestionViewMap'
import type { CourseQuizQuestionType } from '@/mock/course/courseItems'

interface CourseQuizQuestionsViewProps {
  content: CourseQuestionFlowContent
  currentContentId: string
  onSubmit: () => void
}

function getCurrentQuestionType(
  content: CourseQuestionFlowContent,
  questionIndex: number
): CourseQuizQuestionType {
  return content.data.questions[questionIndex]?.type ?? 'single-choice'
}

function getQuestionAnswerKey(
  currentContentId: string,
  questionIndex: number,
  question?: { id: string }
) {
  return question?.id ?? `${currentContentId}-${questionIndex}`
}

function isAnswerComplete(value?: CourseQuizQuestionAnswerValue) {
  if (Array.isArray(value)) {
    return value.length > 0
  }

  return typeof value === 'string' && value.trim().length > 0
}

export function CourseQuizQuestionsView({
  content,
  currentContentId,
  onSubmit,
}: CourseQuizQuestionsViewProps) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [questionAnswers, setQuestionAnswers] = useState<
    Record<string, CourseQuizQuestionAnswerValue>
  >({})
  const question = content.data.questions[questionIndex]
  const questionAnswerKey = getQuestionAnswerKey(
    currentContentId,
    questionIndex,
    question
  )
  const QuestionView = courseQuizQuestionViewMap[
    getCurrentQuestionType(content, questionIndex)
  ]
  const lastQuestionIndex = Math.max(content.data.questions.length - 1, 0)
  const allQuestionsAnswered =
    content.data.questions.length > 0 &&
    content.data.questions.every((quizQuestion, quizQuestionIndex) =>
      isAnswerComplete(
        questionAnswers[
          getQuestionAnswerKey(currentContentId, quizQuestionIndex, quizQuestion)
        ]
      )
    )

  function goToNextQuestion() {
    if (questionIndex >= lastQuestionIndex) {
      onSubmit()
      return
    }

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
      answerValue={questionAnswers[questionAnswerKey]}
      canSubmit={allQuestionsAnswered}
      content={content}
      currentContentId={currentContentId}
      onAnswerValueChange={(answerValue) =>
        setQuestionAnswers((currentAnswers) => ({
          ...currentAnswers,
          [questionAnswerKey]: answerValue,
        }))
      }
      onNextQuestion={goToNextQuestion}
      onPreviousQuestion={goToPreviousQuestion}
      question={question}
      questionIndex={questionIndex}
    />
  )
}
