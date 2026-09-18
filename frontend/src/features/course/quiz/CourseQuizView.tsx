import { useState } from 'react'
import { CourseQuizInstructionsView } from '@/features/course/quiz/CourseQuizInstructionsView'
import { CourseQuizQuestionsView } from '@/features/course/quiz/CourseQuizQuestionsView'
import { CourseQuizResultView } from '@/features/course/quiz/CourseQuizResultView'
import type { CourseQuestionFlowContent } from '@/features/course/quiz/types'

interface CourseQuizViewProps {
  content: CourseQuestionFlowContent
  /** 说明页「跳过」；省略则不渲染该按钮。 */
  onSkip?: () => void
}

type CourseQuizPage = 'instructions' | 'questions' | 'result'

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

export function CourseQuizView({ content, onSkip }: CourseQuizViewProps) {
  // 切换到另一个测验/作业时用 key 重挂答题流程，使页面状态
  // 自然回到说明页，替代先渲染旧页再被 effect 重置的双趟渲染
  return (
    <CourseQuizFlow key={content.id} content={content} onSkip={onSkip} />
  )
}

function CourseQuizFlow({
  content,
  onSkip,
}: {
  content: CourseQuestionFlowContent
  onSkip?: () => void
}) {
  const pageTitles = getCourseQuizPageTitles(content)
  const [currentQuizPage, setCurrentQuizPage] =
    useState<CourseQuizPage>('instructions')

  if (currentQuizPage === 'questions') {
    return (
      <CourseQuizQuestionsView
        content={content}
        currentContentId={content.id}
        onSubmit={() => setCurrentQuizPage('result')}
      />
    )
  }

  if (currentQuizPage === 'result') {
    return <CourseQuizResultView content={content} title={pageTitles.result} />
  }

  return (
    <CourseQuizInstructionsView
      content={content}
      onSkip={onSkip}
      onStart={() => setCurrentQuizPage('questions')}
      title={pageTitles.instructions}
    />
  )
}
