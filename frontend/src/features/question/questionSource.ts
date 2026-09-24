import type {
  AttemptResult,
  AttemptSubmission,
  QuestionSetSummary,
  QuestionSetView,
} from '@/types/question'

/**
 * 题库数据来源的唯一边界。questionApi 的 hooks 只依赖这个接口：
 * 现在由 fixture 适配器实现，后端题库接口交付后换成 apiClient 实现，
 * hooks 签名与组件都不用改。
 */
export interface QuestionSource {
  listQuestionSets(): Promise<QuestionSetSummary[]>
  getQuestionSet(setId: string): Promise<QuestionSetView>
  /**
   * batch 模式整组提交；immediate 模式每次只带一题。结果同步返回
   * （首期主观题不评阅，没有 pending）。
   */
  submitAttempts(setId: string, submissions: AttemptSubmission[]): Promise<AttemptResult[]>
}

export type QuestionApiErrorCode =
  | 'not_found'
  | 'content_version_mismatch'
  | 'already_submitted'
  | 'invalid_submission'

export class QuestionApiError extends Error {
  readonly code: QuestionApiErrorCode

  constructor(code: QuestionApiErrorCode, message: string) {
    super(message)
    this.name = 'QuestionApiError'
    this.code = code
  }
}
