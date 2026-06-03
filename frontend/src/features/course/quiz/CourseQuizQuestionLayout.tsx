import type { ReactNode } from 'react'

import {
  BottomActionBar,
  BottomActionBarButton,
} from '@/components/BottomActionBar'
import type { CourseQuizQuestionViewProps } from '@/features/course/quiz/courseQuizQuestionViewMap'
import { cn } from '@/lib/utils'

interface CourseQuizQuestionLayoutProps
  extends Pick<
    CourseQuizQuestionViewProps,
    | 'canSubmit'
    | 'content'
    | 'currentContentId'
    | 'onNextQuestion'
    | 'onPreviousQuestion'
    | 'question'
    | 'questionIndex'
  > {
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

// 底部操作区：按钮上移用底部内边距实现（让遮罩能一直盖到页面底部），内容左对齐偏移由这里控制。
const questionActionFooterClassName = 'pb-9'
const questionActionContentAlignClassName = 'pl-5'

export function CourseQuizQuestionLayout({
  canContinue,
  canSubmit,
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
      <div className="scrollbar-fade h-full min-h-0 overflow-y-auto px-10 pb-28 pt-28">
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
        footerClassName={questionActionFooterClassName}
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
              disabled={isLastQuestion ? !canSubmit : !canContinue}
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
