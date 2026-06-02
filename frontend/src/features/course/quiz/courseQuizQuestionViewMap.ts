import type { ReactElement } from 'react'
import type { CourseQuizContent } from '@/features/course/CourseMainContent'
import { CourseQuizFillBlankQuestionView } from '@/features/course/quiz/CourseQuizFillBlankQuestionView'
import { CourseQuizMultipleChoiceQuestionView } from '@/features/course/quiz/CourseQuizMultipleChoiceQuestionView'
import { CourseQuizShortAnswerQuestionView } from '@/features/course/quiz/CourseQuizShortAnswerQuestionView'
import { CourseQuizSingleChoiceQuestionView } from '@/features/course/quiz/CourseQuizSingleChoiceQuestionView'
import type {
  CourseQuizQuestion,
  CourseQuizQuestionType,
} from '@/mock/course/courseItems'

export interface CourseQuizQuestionViewProps {
  content: CourseQuizContent
  currentContentId: string
  question?: CourseQuizQuestion
  questionIndex: number
}

export const courseQuizQuestionViewMap: Record<
  CourseQuizQuestionType,
  (props: CourseQuizQuestionViewProps) => ReactElement | null
> = {
  'single-choice': CourseQuizSingleChoiceQuestionView,
  'multiple-choice': CourseQuizMultipleChoiceQuestionView,
  'fill-blank': CourseQuizFillBlankQuestionView,
  'short-answer': CourseQuizShortAnswerQuestionView,
}
