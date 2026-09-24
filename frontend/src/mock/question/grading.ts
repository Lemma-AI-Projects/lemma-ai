import { QuestionApiError } from '@/features/question/questionSource'
import type {
  AttemptResult,
  AttemptSubmission,
  ReferenceAnswer,
  ResponseSlot,
  SlotResponse,
  SlotResult,
  SlotVerdict,
} from '@/types/question'
import type { QuestionFixture } from './types'

// 模拟后端判分。真实判分在后端；这里只为让前端在没有后端时走通完整数据流。
// 规则按方案 §6 首期约定：客观槽位自动判分、每个 1 分；主观题（essay）恒为
// not-graded 且不计分；参考答案对不上的槽位不评阅。

function slotsOf(fixture: QuestionFixture): ResponseSlot[] {
  const { view } = fixture
  return [...view.slots, ...view.subQuestions.flatMap((sub) => sub.slots)]
}

function isEmpty(response: SlotResponse | null): boolean {
  if (!response) return true
  switch (response.kind) {
    case 'choice':
      return response.optionIds.length === 0
    case 'pool-assign':
      return response.optionId === null
    case 'judge':
      return response.value === null
    case 'text':
    case 'essay':
      return response.text.trim() === ''
  }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** "(s)atisfied"：括号里的字符可有可无（方案 §1.2，学科网机阅约定）。 */
function exactPattern(accepted: string): RegExp {
  let source = ''
  let last = 0
  for (const match of accepted.matchAll(/\(([^)]*)\)/g)) {
    source += escapeRegExp(accepted.slice(last, match.index))
    source += `(?:${escapeRegExp(match[1])})?`
    last = match.index + match[0].length
  }
  source += escapeRegExp(accepted.slice(last))
  return new RegExp(`^${source}$`, 'i')
}

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ')

function isGradable(slot: ResponseSlot, reference: ReferenceAnswer | undefined): boolean {
  if (slot.mechanism === 'essay' || slot.grading !== 'auto' || !reference) return false
  if (reference.kind === 'missing' || reference.kind === 'rich') return false
  if (reference.kind === 'judge' && reference.value === null) return false
  return true
}

function judge(
  slot: ResponseSlot,
  response: SlotResponse | null,
  reference: ReferenceAnswer | undefined
): SlotVerdict {
  if (slot.mechanism === 'essay') return 'not-graded'
  if (isEmpty(response) || !response) return 'unanswered'
  if (!isGradable(slot, reference) || !reference) return 'not-graded'

  switch (reference.kind) {
    case 'options': {
      const chosen =
        response.kind === 'choice'
          ? response.optionIds
          : response.kind === 'pool-assign' && response.optionId
            ? [response.optionId]
            : []
      const expected = [...reference.optionIds].sort()
      const actual = [...chosen].sort()
      return expected.length === actual.length && expected.every((id, index) => id === actual[index])
        ? 'correct'
        : 'incorrect'
    }
    case 'exact': {
      if (response.kind !== 'text') return 'incorrect'
      const text = normalizeText(response.text)
      return reference.accepted.some((accepted) => exactPattern(normalizeText(accepted)).test(text))
        ? 'correct'
        : 'incorrect'
    }
    case 'judge':
      return response.kind === 'judge' && response.value === reference.value ? 'correct' : 'incorrect'
    default:
      return 'not-graded'
  }
}

export function assertCurrentVersion(fixture: QuestionFixture, submission: AttemptSubmission) {
  if (submission.contentVersion !== fixture.review.contentVersion) {
    throw new QuestionApiError(
      'content_version_mismatch',
      `题目 ${fixture.view.id} 已更新（${submission.contentVersion} → ${fixture.review.contentVersion}）`
    )
  }
}

export function gradeSubmission(
  fixture: QuestionFixture,
  submission: AttemptSubmission
): AttemptResult {
  const attemptId = `att_${crypto.randomUUID()}`

  if (fixture.view.structure === 'raw') {
    return {
      attemptId,
      questionId: fixture.view.id,
      status: 'ungradable',
      score: null,
      slots: [],
      review: fixture.review,
    }
  }

  const responses = new Map(submission.responses.map((entry) => [entry.slotId, entry.response]))
  const references = new Map(
    fixture.review.referenceAnswers.map((entry) => [entry.slotId, entry.answer])
  )

  let earned = 0
  let total = 0
  const slots: SlotResult[] = slotsOf(fixture).map((slot) => {
    const response = responses.get(slot.id) ?? null
    const reference = references.get(slot.id)
    const verdict = judge(slot, response, reference)
    const gradable = isGradable(slot, reference)
    if (gradable) {
      total += 1
      if (verdict === 'correct') earned += 1
    }
    return {
      slotId: slot.id,
      verdict,
      response,
      score: gradable ? { earned: verdict === 'correct' ? 1 : 0, total: 1 } : null,
      feedback: null,
    }
  })

  return {
    attemptId,
    questionId: fixture.view.id,
    status: total > 0 ? 'graded' : 'ungradable',
    score: total > 0 ? { earned, total } : null,
    slots,
    review: fixture.review,
  }
}
