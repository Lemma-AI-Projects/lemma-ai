import type { ReactNode } from 'react'

import {
  BottomActionBar,
  BottomActionBarButton,
} from '@/components/BottomActionBar'
import type { CourseQuizQuestionViewProps } from '@/features/course/quiz/courseQuizQuestionViewMap'
import { cn } from '@/lib/utils'

interface CourseQuizQuestionLayoutProps
  extends CourseQuizQuestionViewProps {
  canContinue: boolean
  children?: ReactNode
  title: string
}

// 题目标题的大小、字重和位置由这里控制。
const questionTitleClassName =
  'text-[22px] font-semibold leading-7 tracking-tight text-zinc-950'

// 题面文字的字重单独由这里控制。
const questionStemWeightClassName = 'font-normal'
const questionStemClassName = cn(
  'mt-6 text-[17px] leading-8 text-zinc-900',
  questionStemWeightClassName
)

// 底部题目操作区在题目页的上移距离和内容对齐由这里控制。
const questionActionFooterOffsetClassName = 'bottom-4'
const questionActionContentAlignClassName = 'pl-5'

export function CourseQuizQuestionLayout({
  canContinue,
  children,
  content,
  onNextQuestion,
  onPreviousQuestion,
  question,
  questionIndex,
  title,
}: CourseQuizQuestionLayoutProps) {
  const isLastQuestion = questionIndex >= content.data.questions.length - 1

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-zinc-50">
      <div className="scrollbar-fade h-full min-h-0 overflow-y-auto px-10 pb-24 pt-28">
        <article className="mx-auto w-full max-w-[650px] pl-5">
          <h1 className={questionTitleClassName}>
            {question?.order ?? questionIndex + 1}.{title}
          </h1>
          {question?.stem ? (
            <p className={questionStemClassName}>{question.stem}</p>
          ) : null}
          {children}
        </article>
      </div>
      <BottomActionBar
        footerClassName={questionActionFooterOffsetClassName}
        contentClassName={questionActionContentAlignClassName}
        left={
          questionIndex > 0 ? (
            <BottomActionBarButton
              type="button"
              tone="light"
              onClick={onPreviousQuestion}
            >
              上一题
            </BottomActionBarButton>
          ) : null
        }
        right={
          <>
            {!isLastQuestion ? (
              <BottomActionBarButton
                type="button"
                tone="light"
                onClick={onNextQuestion}
              >
                跳过
              </BottomActionBarButton>
            ) : null}
            <BottomActionBarButton
              type="button"
              disabled={!canContinue}
              onClick={onNextQuestion}
            >
              {isLastQuestion ? '提交' : '下一题'}
            </BottomActionBarButton>
          </>
        }
      />
    </div>
  )
}
