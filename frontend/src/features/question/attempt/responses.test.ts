import { describe, expect, it } from 'vitest'

import { questionSetFixtures } from '@/mock/question/sets'
import type { QuestionView, ResponseSlot, SlotResponse } from '@/types/question'
import { createAttemptStore } from './attemptStore'
import {
  answerProgress,
  answerableSlots,
  buildSubmission,
  isQuestionComplete,
  isResponseFilled,
  questionSlots,
} from './responses'

function sampleResponse(question: QuestionView, slot: ResponseSlot): SlotResponse | null {
  const groups = [...question.optionGroups, ...question.subQuestions.flatMap((sub) => sub.optionGroups)]
  const group = groups.find((candidate) => candidate.id === slot.optionGroupId)
  switch (slot.mechanism) {
    case 'choice':
      return { kind: 'choice', optionIds: group ? [group.options[0].id] : [] }
    case 'pool-assign':
      return { kind: 'pool-assign', optionId: group?.options[0].id ?? null }
    case 'text':
      return { kind: 'text', text: 'answer' }
    case 'judge':
      return { kind: 'judge', value: true }
    case 'essay':
      return { kind: 'essay', text: '解答过程' }
    case 'unsupported':
      return null
  }
}

const allQuestions = questionSetFixtures.flatMap((set) => set.questions.map((fixture) => fixture.view))

describe('buildSubmission', () => {
  it.each(allQuestions.map((question) => [question.id, question] as const))(
    '%s 能产出覆盖全部槽位的提交',
    (_id, question) => {
      const responses = Object.fromEntries(
        answerableSlots(question).map((slot) => [slot.id, sampleResponse(question, slot)])
      )
      const submission = buildSubmission(question, responses, new Date('2026-09-24T10:00:00Z'))

      expect(submission.questionId).toBe(question.id)
      expect(submission.contentVersion).toBe(question.contentVersion)
      expect(submission.clientSubmittedAt).toBe('2026-09-24T10:00:00.000Z')
      expect(submission.responses.map((entry) => entry.slotId)).toEqual(
        questionSlots(question).map((slot) => slot.id)
      )
      expect(isQuestionComplete(question, responses)).toBe(true)
    }
  )

  it('未填与空字符串一律提交为 null', () => {
    const question = allQuestions.find((candidate) => candidate.id === 'q_f02')!
    const [first, second] = question.slots
    const submission = buildSubmission(question, {
      [first.id]: { kind: 'text', text: '   ' },
    })
    expect(submission.responses.find((entry) => entry.slotId === first.id)?.response).toBeNull()
    expect(submission.responses.find((entry) => entry.slotId === second.id)?.response).toBeNull()
  })
})

describe('完成度', () => {
  it('unsupported 与只读降级题不计入', () => {
    const anomalies = allQuestions.find((candidate) => candidate.id === 'q_f17')!
    expect(answerableSlots(anomalies).map((slot) => slot.mechanism)).toEqual(['text', 'choice'])
    const raw = allQuestions.find((candidate) => candidate.id === 'q_f16')!
    expect(answerProgress(raw, {})).toEqual({ answered: 0, total: 0 })
  })

  it('判断题的 null 是未作答，false 是答了"错"', () => {
    expect(isResponseFilled({ kind: 'judge', value: null })).toBe(false)
    expect(isResponseFilled({ kind: 'judge', value: false })).toBe(true)
    expect(isResponseFilled({ kind: 'choice', optionIds: [] })).toBe(false)
    expect(isResponseFilled({ kind: 'pool-assign', optionId: null })).toBe(false)
  })
})

describe('attemptStore', () => {
  it('只在值变化时通知，updateResponse 读到的是最新值', () => {
    const store = createAttemptStore()
    let notified = 0
    store.subscribe(() => {
      notified += 1
    })
    const add = (optionId: string) =>
      store.updateResponse('s1', (current) => ({
        kind: 'choice',
        optionIds: [...(current?.kind === 'choice' ? current.optionIds : []), optionId],
      }))
    add('A')
    add('B')
    expect(store.getResponse('s1')).toEqual({ kind: 'choice', optionIds: ['A', 'B'] })
    const same = store.getResponse('s1')
    store.setResponse('s1', same)
    expect(notified).toBe(2)
  })
})
