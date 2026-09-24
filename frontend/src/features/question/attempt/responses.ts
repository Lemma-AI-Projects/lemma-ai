import type {
  AttemptSubmission,
  QuestionView,
  ResponseSlot,
  SlotResponse,
} from '@/types/question'
import type { AttemptResponses } from './attemptStore'

/** 一道题的全部槽位（顶层 + 各小题），按原文顺序。 */
export function questionSlots(question: QuestionView): ResponseSlot[] {
  return [...question.slots, ...question.subQuestions.flatMap((sub) => sub.slots)]
}

/** 计入完成度的槽位：只读降级题与 unsupported 不算。 */
export function answerableSlots(question: QuestionView): ResponseSlot[] {
  if (question.structure === 'raw') return []
  return questionSlots(question).filter((slot) => slot.mechanism !== 'unsupported')
}

export function isResponseFilled(response: SlotResponse | null | undefined): boolean {
  if (!response) return false
  switch (response.kind) {
    case 'choice':
      return response.optionIds.length > 0
    case 'pool-assign':
      return response.optionId !== null
    case 'judge':
      return response.value !== null
    case 'text':
    case 'essay':
      return response.text.trim().length > 0
  }
}

export function answerProgress(question: QuestionView, responses: AttemptResponses) {
  const slots = answerableSlots(question)
  const answered = slots.filter((slot) => isResponseFilled(responses[slot.id])).length
  return { answered, total: slots.length }
}

/** "填写完整"：所有计入完成度的槽位都有值。与"已提交""已判分"是三件事。 */
export function isQuestionComplete(question: QuestionView, responses: AttemptResponses) {
  const { answered, total } = answerProgress(question, responses)
  return answered === total
}

/** 未填的槽位一律提交为 null（未作答），不把空字符串当作答案。 */
export function buildSubmission(
  question: QuestionView,
  responses: AttemptResponses,
  submittedAt: Date = new Date()
): AttemptSubmission {
  return {
    questionId: question.id,
    contentVersion: question.contentVersion,
    responses: questionSlots(question).map((slot) => {
      const response = responses[slot.id] ?? null
      return { slotId: slot.id, response: isResponseFilled(response) ? response : null }
    }),
    clientSubmittedAt: submittedAt.toISOString(),
  }
}
