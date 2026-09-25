import { useState } from 'react'

import { BottomActionBarButton } from '@/components/BottomActionBar'
import { Spinner } from '@/components/ui/spinner'
import { AttemptProvider } from '../attempt/AttemptProvider'
import { answerProgress } from '../attempt/responses'
import { useAttemptResponses } from '../attempt/useAttempt'
import type { QuestionPlayerMode } from '../content/renderModel'
import { useQuestionSetQuery } from '../questionApi'
import { QuestionPage } from './QuestionPage'

function BrowserBody({ setId, mode }: { setId: string; mode: Exclude<QuestionPlayerMode, 'review'> }) {
  const [index, setIndex] = useState(0)
  const setQuery = useQuestionSetQuery(setId)
  const responses = useAttemptResponses()

  if (setQuery.isPending || setQuery.data?.status === 'generating') {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        <Spinner className="mr-2" />
        {setQuery.isPending ? '题目加载中…' : '正在出题…'}
      </div>
    )
  }
  if (setQuery.isError || setQuery.data.status === 'failed') {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        {setQuery.isError ? '题目加载失败' : '出题失败'}
      </div>
    )
  }

  const questions = setQuery.data.questions
  const safeIndex = Math.min(index, Math.max(questions.length - 1, 0))
  const question = questions[safeIndex]
  if (!question) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        这个题组没有题目。
      </div>
    )
  }

  const progress = answerProgress(question, responses)

  return (
    <QuestionPage
      question={question}
      index={safeIndex}
      total={questions.length}
      mode={mode}
      progress={
        mode === 'answer' && progress.total > 0 ? `已答 ${progress.answered}/${progress.total}` : '预览'
      }
      left={
        safeIndex > 0 ? (
          <BottomActionBarButton type="button" tone="light" onClick={() => setIndex(safeIndex - 1)}>
            上一题
          </BottomActionBarButton>
        ) : null
      }
      right={
        safeIndex < questions.length - 1 ? (
          <BottomActionBarButton type="button" onClick={() => setIndex(safeIndex + 1)}>
            下一题
          </BottomActionBarButton>
        ) : null
      }
    />
  )
}

/** 逐题浏览一个题组（预览 / 自由作答，不提交）。用于调试页核对渲染。 */
export function QuestionSetBrowser({
  setId,
  mode,
}: {
  setId: string
  mode: Exclude<QuestionPlayerMode, 'review'>
}) {
  return (
    <AttemptProvider>
      <BrowserBody setId={setId} mode={mode} />
    </AttemptProvider>
  )
}
