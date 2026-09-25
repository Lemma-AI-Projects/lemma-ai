import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { retryUnlessClientError } from '@/lib/apiUtils'
import type { AttemptResult, AttemptSubmission } from '@/types/question'
import { httpQuestionSource } from './httpQuestionSource'
import { QuestionApiError, type QuestionSource } from './questionSource'

const source: QuestionSource = httpQuestionSource

// 题组还在后台出题（status = generating）时的轮询间隔；就绪/空/失败后自停。
const GENERATING_POLL_MS = 2000

export const questionSetsQueryRootKey = ['question-sets'] as const

export function questionSetQueryKey(setId: string) {
  return [...questionSetsQueryRootKey, 'detail', setId] as const
}

/**
 * 一次作答会话内已拿到的判分结果。故意不挂 question-sets 前缀：题组详情的失效
 * 不该冲掉结果。会话 id 由流程组件生成，重新开始 = 新会话。
 */
export function attemptResultsQueryKey(setId: string, sessionId: string) {
  return ['question-attempt-results', setId, sessionId] as const
}

function retryUnlessBusinessError(failureCount: number, error: unknown) {
  if (error instanceof QuestionApiError) return false
  return retryUnlessClientError(failureCount, error)
}

export function useQuestionSetsQuery() {
  return useQuery({
    queryKey: [...questionSetsQueryRootKey, 'list'] as const,
    queryFn: () => source.listQuestionSets(),
    retry: retryUnlessBusinessError,
  })
}

export function useQuestionSetQuery(setId: string | undefined) {
  return useQuery({
    queryKey: questionSetQueryKey(setId ?? 'none'),
    queryFn: () => source.getQuestionSet(setId as string),
    enabled: Boolean(setId),
    // 作答期间题面不应在背后被替换；版本变化由提交时的 contentVersion 校验兜住。
    staleTime: Infinity,
    refetchInterval: (query) =>
      query.state.data?.status === 'generating' ? GENERATING_POLL_MS : false,
    retry: retryUnlessBusinessError,
  })
}

/**
 * 服务端当前作答会话里已判分的结果作为初值（逐题模式刷新后恢复锁定）；
 * 之后的结果只由提交成功时写入（见 useSubmitAttemptsMutation）。
 */
export function useAttemptResultsQuery(
  setId: string,
  sessionId: string,
  initialResults: AttemptResult[] = []
) {
  return useQuery({
    queryKey: attemptResultsQueryKey(setId, sessionId),
    queryFn: (): AttemptResult[] => initialResults,
    initialData: initialResults,
    staleTime: Infinity,
  })
}

export function useSubmitAttemptsMutation(setId: string, sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (submissions: AttemptSubmission[]) =>
      source.submitAttempts(setId, submissions),
    onSuccess: (results) => {
      queryClient.setQueryData<AttemptResult[]>(
        attemptResultsQueryKey(setId, sessionId),
        (current = []) => {
          const byQuestion = new Map(current.map((result) => [result.questionId, result]))
          for (const result of results) byQuestion.set(result.questionId, result)
          return [...byQuestion.values()]
        }
      )
    },
  })
}
