import { useContext, useMemo } from 'react'

import type { AttemptResult, QuestionView } from '@/types/question'
import { AttemptProvider } from '../attempt/AttemptProvider'
import { AttemptStoreContext } from '../attempt/attemptContext'
import { QuestionContent } from '../content/QuestionContent'
import {
  buildRenderModel,
  QuestionRenderContext,
  type QuestionPlayerMode,
} from '../content/renderModel'
import { QuestionReviewFooter } from './QuizReviewPanel'

interface QuestionPlayerProps {
  question: QuestionView
  mode: QuestionPlayerMode
  /** review 态需要：逐空对错、作答回显、参考答案与解析都来自这里。 */
  result?: AttemptResult | null
  className?: string
}

function QuestionPlayerBody({ question, mode, result = null, className }: QuestionPlayerProps) {
  const model = useMemo(() => buildRenderModel(question, mode, result), [question, mode, result])
  return (
    <QuestionRenderContext.Provider value={model}>
      <div className={className}>
        <QuestionContent />
        <QuestionReviewFooter />
      </div>
    </QuestionRenderContext.Provider>
  )
}

/**
 * 一道题的三态渲染器：answer（受控作答）/ review（只读 + 对错 + 参考答案与解析）/
 * preview（静态题面，用于卡片缩略）。在题组流程里共用流程的作答草稿；单独使用时
 * 自带一份。
 */
export function QuestionPlayer(props: QuestionPlayerProps) {
  const store = useContext(AttemptStoreContext)
  const body = <QuestionPlayerBody {...props} />
  return store ? body : <AttemptProvider>{body}</AttemptProvider>
}
