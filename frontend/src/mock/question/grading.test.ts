import { describe, expect, it } from 'vitest'

import { QuestionApiError } from '@/features/question/questionSource'
import type { AttemptSubmission, SlotResponse } from '@/types/question'
import { f14MultipleChoice, f18StaleVersion } from './constructed'
import {
  f01ChineseIdiomSingle,
  f05ClassicReadingBlanks,
  f08PoemSubquestions,
  f09Judge,
  f10SevenChooseFive,
  f11ExactBlanks,
  f16RawMassive,
} from './docSamples'
import { gradeSubmission } from './grading'
import { mockQuestionSource } from './mockQuestionSource'
import type { QuestionFixture } from './types'

function submit(
  fixture: QuestionFixture,
  responses: Record<string, SlotResponse | null>
): AttemptSubmission {
  const slots = [...fixture.view.slots, ...fixture.view.subQuestions.flatMap((sub) => sub.slots)]
  return {
    questionId: fixture.view.id,
    contentVersion: fixture.view.contentVersion,
    responses: slots.map((slot) => ({ slotId: slot.id, response: responses[slot.id] ?? null })),
    clientSubmittedAt: '2026-09-24T10:00:00Z',
  }
}

describe('模拟判分', () => {
  it('单选：对 / 错 / 未作答', () => {
    const correct = gradeSubmission(
      f01ChineseIdiomSingle,
      submit(f01ChineseIdiomSingle, { 'q_f01:bk': { kind: 'choice', optionIds: ['q_f01:og1:C'] } })
    )
    expect(correct).toMatchObject({ status: 'graded', score: { earned: 1, total: 1 } })
    expect(correct.slots[0]).toMatchObject({ verdict: 'correct', response: { optionIds: ['q_f01:og1:C'] } })
    expect(correct.review?.referenceAnswers).toHaveLength(1)

    const wrong = gradeSubmission(
      f01ChineseIdiomSingle,
      submit(f01ChineseIdiomSingle, { 'q_f01:bk': { kind: 'choice', optionIds: ['q_f01:og1:A'] } })
    )
    expect(wrong.slots[0].verdict).toBe('incorrect')

    const empty = gradeSubmission(f01ChineseIdiomSingle, submit(f01ChineseIdiomSingle, {}))
    expect(empty.slots[0].verdict).toBe('unanswered')
    expect(empty.score).toEqual({ earned: 0, total: 1 })
  })

  it('多选必须完全一致', () => {
    const partial = gradeSubmission(
      f14MultipleChoice,
      submit(f14MultipleChoice, { 'q_f14a:bk': { kind: 'choice', optionIds: ['q_f14a:og1:A'] } })
    )
    expect(partial.slots[0].verdict).toBe('incorrect')
    const full = gradeSubmission(
      f14MultipleChoice,
      submit(f14MultipleChoice, {
        'q_f14a:bk': { kind: 'choice', optionIds: ['q_f14a:og1:B', 'q_f14a:og1:A'] },
      })
    )
    expect(full.slots[0].verdict).toBe('correct')
  })

  it('判断题按布尔值判', () => {
    const result = gradeSubmission(
      f09Judge,
      submit(f09Judge, {
        'q_f09:sq1:bk1': { kind: 'judge', value: false },
        'q_f09:sq2:bk2': { kind: 'judge', value: false },
      })
    )
    expect(result.slots.map((slot) => slot.verdict)).toEqual(['correct', 'incorrect'])
  })

  it('七选五按空逐个判', () => {
    const result = gradeSubmission(
      f10SevenChooseFive,
      submit(f10SevenChooseFive, {
        'q_f10:bk1': { kind: 'pool-assign', optionId: 'q_f10:og1:D' },
        'q_f10:bk2': { kind: 'pool-assign', optionId: 'q_f10:og1:A' },
      })
    )
    expect(result.slots.map((slot) => slot.verdict)).toEqual([
      'correct', 'incorrect', 'unanswered', 'unanswered', 'unanswered',
    ])
    expect(result.score).toEqual({ earned: 1, total: 5 })
  })

  it('机阅填空：## 多解、(s) 可选字符、大小写与空白不敏感', () => {
    const result = gradeSubmission(
      f11ExactBlanks,
      submit(f11ExactBlanks, {
        'q_f11:bk6': { kind: 'text', text: 'journey' },
        'q_f11:bk8': { kind: 'text', text: 'atisfied' },
        'q_f11:bk9': { kind: 'text', text: '  surprisingly ' },
        'q_f11:bk10': { kind: 'text', text: 'luck' },
      })
    )
    const verdicts = Object.fromEntries(result.slots.map((slot) => [slot.slotId, slot.verdict]))
    expect(verdicts['q_f11:bk6']).toBe('correct')
    expect(verdicts['q_f11:bk8']).toBe('correct')
    expect(verdicts['q_f11:bk9']).toBe('correct')
    expect(verdicts['q_f11:bk10']).toBe('incorrect')
  })

  it('主观题恒为 not-graded 且不计分', () => {
    const result = gradeSubmission(
      f08PoemSubquestions,
      submit(f08PoemSubquestions, {
        'q_f08:sq1:bk': { kind: 'choice', optionIds: ['q_f08:sq1:og1:D'] },
        'q_f08:sq2:bk': { kind: 'essay', text: '拟人' },
      })
    )
    expect(result.status).toBe('graded')
    expect(result.score).toEqual({ earned: 1, total: 1 })
    expect(result.slots[1]).toMatchObject({ verdict: 'not-graded', score: null })
  })

  it('参考答案对不上的填空不评阅；只读题 ungradable', () => {
    const blanks = gradeSubmission(
      f05ClassicReadingBlanks,
      submit(f05ClassicReadingBlanks, { 'q_f05:bk1': { kind: 'text', text: '祥子' } })
    )
    expect(blanks.status).toBe('ungradable')
    expect(blanks.slots[0].verdict).toBe('not-graded')
    expect(blanks.review?.answerFallback).not.toBeNull()

    const raw = gradeSubmission(f16RawMassive, submit(f16RawMassive, {}))
    expect(raw).toMatchObject({ status: 'ungradable', score: null, slots: [] })
  })
})

describe('mockQuestionSource', () => {
  it('作答视图不带 review，也不带参考答案', async () => {
    const set = await mockQuestionSource.getQuestionSet('set-doc-samples')
    expect(JSON.stringify(set)).not.toMatch(/referenceAnswers|answerFallback|explanation"/)
  })

  it('版本过期整组拒绝', async () => {
    const stale = submit(f18StaleVersion, {})
    const fresh = submit(f01ChineseIdiomSingle, {})
    await expect(mockQuestionSource.submitAttempts('set-f18-stale', [fresh, stale])).rejects.toMatchObject({
      code: 'content_version_mismatch',
    })
    await expect(mockQuestionSource.submitAttempts('set-f18-stale', [stale])).rejects.toBeInstanceOf(
      QuestionApiError
    )
  })

  it('不存在的题组与题目', async () => {
    await expect(mockQuestionSource.getQuestionSet('nope')).rejects.toMatchObject({ code: 'not_found' })
    await expect(
      mockQuestionSource.submitAttempts('set-doc-samples', [submit(f18StaleVersion, {})])
    ).rejects.toMatchObject({ code: 'invalid_submission' })
  })
})
