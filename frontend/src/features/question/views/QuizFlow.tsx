import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { BottomActionBarButton } from '@/components/BottomActionBar'
import { ContentPageLayout } from '@/components/ContentPageLayout'
import { RichHtml } from '@/components/RichHtml'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { AttemptResult, QuestionSetView } from '@/types/question'
import { AttemptProvider } from '../attempt/AttemptProvider'
import { answerProgress, buildSubmission } from '../attempt/responses'
import { useAttemptResponses } from '../attempt/useAttempt'
import {
  useAttemptResultsQuery,
  useQuestionSetQuery,
  useSubmitAttemptsMutation,
} from '../questionApi'
import { QuestionApiError } from '../questionSource'
import { questionSetKindTitle } from './labels'
import { QuestionPage } from './QuestionPage'
import { QuizResultView } from './QuizResultView'
import { UnansweredDialog, type UnansweredItem } from './UnansweredDialog'

/** 流程阶段；页面据此决定伴学 AI 是否禁用等（answering 期间应禁用）。 */
export type QuizFlowPhase =
  | 'loading'
  | 'error'
  | 'instructions'
  | 'answering'
  | 'result'
  | 'reviewing'

type Stage = 'instructions' | 'answering' | 'result' | 'reviewing'

interface QuizFlowProps {
  setId: string
  /** 调用方附加在说明页里的场景文案（例如课程测验规则）。 */
  instructions?: ReactNode
  nextHref?: string
  nextLabel?: string
  /** 说明页「跳过」；省略则不渲染。 */
  onExit?: () => void
  onPhaseChange?: (phase: QuizFlowPhase) => void
}

function submitErrorMessage(error: unknown): string {
  if (error instanceof QuestionApiError && error.code === 'content_version_mismatch') {
    return '题目内容已更新，本次提交未被接受。请刷新后重新作答。'
  }
  return '提交失败，请重试。'
}

function CenteredNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-zinc-50 px-6 text-center text-sm text-zinc-500">
      {children}
    </div>
  )
}

function SubmitNotice({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
      {message}
    </p>
  )
}

function QuizFlowSession({
  set,
  sessionId,
  instructions,
  nextHref,
  nextLabel,
  onExit,
  onStageChange,
}: {
  set: QuestionSetView
  sessionId: string
  instructions?: ReactNode
  nextHref?: string
  nextLabel?: string
  onExit?: () => void
  onStageChange: (stage: Stage) => void
}) {
  const [stage, setStage] = useState<Stage>('instructions')
  const [index, setIndex] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const responses = useAttemptResponses()
  const resultsQuery = useAttemptResultsQuery(set.id, sessionId, set.openAttempt?.results)
  const submitMutation = useSubmitAttemptsMutation(set.id, sessionId)

  const results = useMemo(
    () => new Map<string, AttemptResult>((resultsQuery.data ?? []).map((result) => [result.questionId, result])),
    [resultsQuery.data]
  )

  const goTo = (next: Stage, nextIndex?: number) => {
    setStage(next)
    if (nextIndex !== undefined) setIndex(nextIndex)
    onStageChange(next)
    submitMutation.reset()
  }

  const questions = set.questions
  const question = questions[index]
  const lastIndex = questions.length - 1
  const isLast = index >= lastIndex
  const kindTitle = questionSetKindTitle[set.kind]

  if (stage === 'instructions') {
    const sectionInstructions = set.sections.flatMap((section) =>
      section.instructions ? [section.instructions] : []
    )
    return (
      <ContentPageLayout title={kindTitle} titleAlign="center" showFooter={false} contentClassName="max-w-[560px]">
        <h2 className="text-[22px] font-semibold leading-7 tracking-tight text-zinc-950">{set.title}</h2>
        {sectionInstructions.map((entry, entryIndex) => (
          <RichHtml key={entryIndex} html={entry.html} className="mt-5 text-[16px] leading-[26px] text-zinc-700" />
        ))}
        {instructions ? <div className="mt-8">{instructions}</div> : null}
        <div className="mt-10 flex justify-end gap-3">
          {onExit ? (
            <Button
              type="button"
              variant="outline"
              onClick={onExit}
              className="h-9 rounded-full border-zinc-300 bg-transparent px-4 font-normal text-zinc-700 hover:bg-accent hover:text-accent-foreground"
            >
              跳过
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={questions.length === 0}
            onClick={() => goTo('answering', 0)}
            className="h-9 rounded-full bg-zinc-950 px-4 font-normal text-white hover:bg-zinc-800"
          >
            开始
          </Button>
        </div>
      </ContentPageLayout>
    )
  }

  if (stage === 'result') {
    return (
      <QuizResultView
        set={set}
        results={results}
        onReview={(reviewIndex) => goTo('reviewing', reviewIndex)}
        nextHref={nextHref}
        nextLabel={nextLabel}
      />
    )
  }

  if (!question) {
    return <CenteredNotice>这个题组没有题目。</CenteredNotice>
  }

  const previousButton =
    index > 0 ? (
      <BottomActionBarButton type="button" tone="light" onClick={() => setIndex(index - 1)}>
        上一题
      </BottomActionBarButton>
    ) : null

  if (stage === 'reviewing') {
    return (
      <QuestionPage
        question={question}
        index={index}
        mode="review"
        result={results.get(question.id) ?? null}
        left={previousButton}
        right={
          <>
            <BottomActionBarButton type="button" tone="light" onClick={() => goTo('result')}>
              返回结果
            </BottomActionBarButton>
            {!isLast ? (
              <BottomActionBarButton type="button" onClick={() => setIndex(index + 1)}>
                下一题
              </BottomActionBarButton>
            ) : null}
          </>
        }
      />
    )
  }

  // ---- answering ----
  const progress = answerProgress(question, responses)
  const isRaw = question.structure === 'raw'
  const questionResult = results.get(question.id)
  const locked = set.mode === 'immediate' && Boolean(questionResult)
  const notice = submitMutation.isError ? <SubmitNotice message={submitErrorMessage(submitMutation.error)} /> : null

  const unansweredItems: UnansweredItem[] =
    set.mode === 'batch'
      ? questions.flatMap((candidate, candidateIndex) => {
          const { answered, total } = answerProgress(candidate, responses)
          return total > answered
            ? [{ index: candidateIndex, title: `${candidateIndex + 1}. ${candidate.meta.typeName ?? '题目'}`, missing: total - answered }]
            : []
        })
      : progress.total > progress.answered
        ? [{ index, title: `${index + 1}. ${question.meta.typeName ?? '题目'}`, missing: progress.total - progress.answered }]
        : []

  const submit = () => {
    const submissions =
      set.mode === 'batch'
        ? questions.map((candidate) => buildSubmission(candidate, responses))
        : [buildSubmission(question, responses)]
    submitMutation.mutate(submissions, {
      onSuccess: () => {
        setConfirmOpen(false)
        if (set.mode === 'batch') goTo('result')
      },
      onError: () => setConfirmOpen(false),
    })
  }

  const requestSubmit = () => {
    if (unansweredItems.length > 0) setConfirmOpen(true)
    else submit()
  }

  const submitting = submitMutation.isPending
  let right: ReactNode

  if (set.mode === 'immediate' && (locked || isRaw)) {
    right = isLast ? (
      <BottomActionBarButton type="button" onClick={() => goTo('result')}>
        查看结果
      </BottomActionBarButton>
    ) : (
      <BottomActionBarButton type="button" onClick={() => setIndex(index + 1)}>
        下一题
      </BottomActionBarButton>
    )
  } else if (set.mode === 'immediate') {
    right = (
      <>
        {!isLast ? (
          <BottomActionBarButton type="button" tone="light" onClick={() => setIndex(index + 1)}>
            跳过
          </BottomActionBarButton>
        ) : null}
        <BottomActionBarButton type="button" disabled={submitting} onClick={requestSubmit}>
          {submitting ? '提交中…' : '提交本题'}
        </BottomActionBarButton>
      </>
    )
  } else if (!isLast) {
    right = (
      <>
        <BottomActionBarButton type="button" tone="light" onClick={() => setIndex(index + 1)}>
          跳过
        </BottomActionBarButton>
        <BottomActionBarButton
          type="button"
          disabled={!isRaw && progress.answered < progress.total}
          onClick={() => setIndex(index + 1)}
        >
          下一题
        </BottomActionBarButton>
      </>
    )
  } else {
    right = (
      <BottomActionBarButton type="button" disabled={submitting} onClick={requestSubmit}>
        {submitting ? '提交中…' : '提交'}
      </BottomActionBarButton>
    )
  }

  return (
    <>
      <QuestionPage
        question={question}
        index={index}
        mode={locked ? 'review' : 'answer'}
        result={questionResult ?? null}
        notice={notice}
        left={previousButton}
        right={right}
      />
      <UnansweredDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        items={unansweredItems}
        isSubmitting={submitting}
        onJump={
          set.mode === 'batch'
            ? (jumpIndex) => {
                setConfirmOpen(false)
                setIndex(jumpIndex)
              }
            : undefined
        }
        onConfirm={submit}
      />
    </>
  )
}

function QuizFlowLoader({ setId, onPhaseChange, ...rest }: QuizFlowProps) {
  const [sessionId] = useState(() => crypto.randomUUID())
  const [stage, setStage] = useState<Stage>('instructions')
  const setQuery = useQuestionSetQuery(setId)
  const setStatus = setQuery.data?.status
  const phase: QuizFlowPhase =
    setQuery.isPending || setStatus === 'generating'
      ? 'loading'
      : setQuery.isError || setStatus === 'empty' || setStatus === 'failed'
        ? 'error'
        : stage

  useEffect(() => {
    onPhaseChange?.(phase)
  }, [onPhaseChange, phase])

  if (setQuery.isPending) {
    return (
      <CenteredNotice>
        <Spinner className="size-5" />
        题目加载中…
      </CenteredNotice>
    )
  }
  if (setQuery.isError) {
    const notFound = setQuery.error instanceof QuestionApiError && setQuery.error.code === 'not_found'
    return (
      <CenteredNotice>
        <p>{notFound ? '题组不存在或已下线' : '题目加载失败'}</p>
        {!notFound ? (
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => void setQuery.refetch()}>
            重试
          </Button>
        ) : null}
      </CenteredNotice>
    )
  }
  if (setStatus === 'generating') {
    return (
      <CenteredNotice>
        <Spinner className="size-5" />
        正在出题…
      </CenteredNotice>
    )
  }
  if (setStatus === 'empty' || setStatus === 'failed') {
    return (
      <CenteredNotice>
        <p>{setStatus === 'empty' ? '没有找到足够的可作答题目' : '出题失败'}</p>
      </CenteredNotice>
    )
  }

  return (
    <QuizFlowSession
      {...rest}
      set={setQuery.data}
      sessionId={sessionId}
      onStageChange={setStage}
    />
  )
}

/**
 * 一次题组作答流程：说明 → 作答（统一提交 / 逐题即时反馈）→ 结果 → 逐题回看。
 * 作答草稿随本组件挂载；重新开始请换 key 重挂。
 */
export function QuizFlow(props: QuizFlowProps) {
  return (
    <AttemptProvider>
      <QuizFlowLoader {...props} />
    </AttemptProvider>
  )
}
