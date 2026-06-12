import { useState } from 'react'
import type { CourseQuestionFlowContent } from '@/features/course/CourseMainContent'
import { CourseQuizInstructionsView } from '@/features/course/quiz/CourseQuizInstructionsView'
import { CourseQuizQuestionsView } from '@/features/course/quiz/CourseQuizQuestionsView'
import { CourseQuizResultView } from '@/features/course/quiz/CourseQuizResultView'

interface CourseQuizViewProps {
  content: CourseQuestionFlowContent
}

type CourseQuizPage = 'instructions' | 'questions' | 'result'

function getCurrentQuizId(content: CourseQuestionFlowContent): string {
  const contentSuffix = content.type === 'assignment' ? 'assignment' : 'quiz'

  if (content.scope === 'unit') {
    return `${content.unit.id}-${contentSuffix}`
  }

  return content.chapter ? `${content.chapter.id}-${contentSuffix}` : ''
}

function getCourseQuizPageTitles(content: CourseQuestionFlowContent) {
  if (content.type === 'assignment') {
    return {
      instructions: '作业',
      result: '作业结果',
    }
  }

  return {
    instructions: '测验',
    result: '测验结果',
  }
}

export function CourseQuizView({ content }: CourseQuizViewProps) {
  // 切换到另一个测验/作业时用 key 重挂载答题流程，使页面状态
  // 自然回到说明页，替代先渲染旧页再被 effect 重置的双趟渲染
  const currentContentId = getCurrentQuizId(content)

  return (
    <CourseQuizFlow
      key={currentContentId}
      content={content}
      currentContentId={currentContentId}
    />
  )
}

function CourseQuizFlow({
  content,
  currentContentId,
}: {
  content: CourseQuestionFlowContent
  currentContentId: string
}) {
  const pageTitles = getCourseQuizPageTitles(content)
  const [currentQuizPage, setCurrentQuizPage] =
    useState<CourseQuizPage>('instructions')

  if (currentQuizPage === 'questions') {
    return (
      <CourseQuizQuestionsView
        content={content}
        currentContentId={currentContentId}
        onSubmit={() => setCurrentQuizPage('result')}
      />
    )
  }

  if (currentQuizPage === 'result') {
    return (
      <CourseQuizResultView
        content={content}
        currentContentId={currentContentId}
        title={pageTitles.result}
      />
    )
  }

  return (
    <CourseQuizInstructionsView
      content={content}
      currentContentId={currentContentId}
      onStart={() => setCurrentQuizPage('questions')}
      title={pageTitles.instructions}
    />
  )
}
