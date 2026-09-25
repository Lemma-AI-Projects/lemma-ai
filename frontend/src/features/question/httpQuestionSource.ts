import { isAxiosError } from 'axios'

import { apiClient } from '@/lib/apiClient'
import { signOutOn401 } from '@/lib/apiUtils'
import type {
  AttemptResult,
  AttemptSubmission,
  QuestionSetSummary,
  QuestionSetView,
} from '@/types/question'
import { QuestionApiError, type QuestionApiErrorCode, type QuestionSource } from './questionSource'

// 后端题库接口（backend/api/v1/question_sets.py）。业务错误以 HTTP 状态 + detail
// 下发：404 not_found、409 content_version_mismatch / already_submitted、
// 422 invalid_submission；其余错误原样抛出，交给通用的重试与 401 处理。

const BUSINESS_CODES: readonly QuestionApiErrorCode[] = [
  'not_found',
  'content_version_mismatch',
  'already_submitted',
  'invalid_submission',
]

const MESSAGES: Record<QuestionApiErrorCode, string> = {
  not_found: '题组不存在或已下线',
  content_version_mismatch: '题目内容已更新',
  already_submitted: '这道题已经提交过了',
  invalid_submission: '提交内容与题目不匹配',
}

export function toQuestionApiError(error: unknown): unknown {
  if (!isAxiosError(error) || !error.response) return error
  const { status, data } = error.response
  const detail: unknown = (data as { detail?: unknown } | undefined)?.detail
  const code =
    typeof detail === 'string' && (BUSINESS_CODES as readonly string[]).includes(detail)
      ? (detail as QuestionApiErrorCode)
      : status === 404
        ? 'not_found'
        : status === 422
          ? 'invalid_submission'
          : null
  return code ? new QuestionApiError(code, MESSAGES[code]) : error
}

async function call<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await signOutOn401(request)
    return data
  } catch (error) {
    throw toQuestionApiError(error)
  }
}

export const httpQuestionSource: QuestionSource = {
  listQuestionSets() {
    return call(apiClient.get<QuestionSetSummary[]>('/api/v1/question-sets'))
  },

  getQuestionSet(setId) {
    return call(apiClient.get<QuestionSetView>(`/api/v1/question-sets/${setId}`))
  },

  submitAttempts(setId, submissions: AttemptSubmission[]) {
    return call(
      apiClient.post<AttemptResult[]>(`/api/v1/question-sets/${setId}/submissions`, { submissions })
    )
  },
}
