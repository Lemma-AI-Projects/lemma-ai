import { useEffect, useState } from 'react'
import type { CourseQuizContent } from '@/features/course/CourseMainContent'
import { CourseQuizInstructionsView } from '@/features/course/quiz/CourseQuizInstructionsView'
import { CourseQuizQuestionsView } from '@/features/course/quiz/CourseQuizQuestionsView'

interface CourseQuizViewProps {
  content: CourseQuizContent
}

type CourseQuizPage = 'instructions' | 'questions'

function getCurrentQuizId(content: CourseQuizContent): string {
  if (content.scope === 'unit') {
    return `${content.unit.id}-quiz`
  }

  return content.chapter ? `${content.chapter.id}-quiz` : ''
}

export function CourseQuizView({ content }: CourseQuizViewProps) {
  const currentContentId = getCurrentQuizId(content)
  const [currentQuizPage, setCurrentQuizPage] =
    useState<CourseQuizPage>('instructions')

  useEffect(() => {
    setCurrentQuizPage('instructions')
  }, [currentContentId])

  if (currentQuizPage === 'questions') {
    return (
      <CourseQuizQuestionsView
        content={content}
        currentContentId={currentContentId}
      />
    )
  }

  return (
    <CourseQuizInstructionsView
      content={content}
      currentContentId={currentContentId}
      onStart={() => setCurrentQuizPage('questions')}
    />
  )
}
