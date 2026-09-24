import { describe, expect, it } from 'vitest'

import { parseRichHtml } from '@/lib/richHtml/parse'
import * as docSamples from './docSamples'
import type { QuestionFixture } from './types'

// fixture 自身的一致性：锚点、槽位、选项组、参考答案之间互相对得上。
// 这些正是方案 §11 要求后端保证的不变量，后端解析器上线后可复用同一组断言。

const parsed = Object.entries(docSamples as Record<string, QuestionFixture>).filter(
  ([, fixture]) => fixture.view.structure === 'parsed'
)

function anchorsIn(...htmls: (string | undefined)[]) {
  const ids = { slot: new Set<string>(), og: new Set<string>(), sq: new Set<string>() }
  for (const html of htmls) {
    if (!html) continue
    const { anchors } = parseRichHtml(html)
    anchors.get('data-slot-id')?.forEach((id) => ids.slot.add(id))
    anchors.get('data-og-id')?.forEach((id) => ids.og.add(id))
    anchors.get('data-sq-id')?.forEach((id) => ids.sq.add(id))
  }
  return ids
}

describe.each(parsed)('%s', (_name, { view, review }) => {
  const allHtml = [view.stem.html, ...view.subQuestions.map((sub) => sub.stem?.html)]
  const anchors = anchorsIn(...allHtml)
  const slots = [...view.slots, ...view.subQuestions.flatMap((sub) => sub.slots)]
  const groups = [...view.optionGroups, ...view.subQuestions.flatMap((sub) => sub.optionGroups)]

  it('槽位 id 唯一', () => {
    expect(new Set(slots.map((slot) => slot.id)).size).toBe(slots.length)
  })

  it('anchored 标记与题干锚点一致', () => {
    for (const slot of slots) expect(anchors.slot.has(slot.id)).toBe(slot.anchored)
    for (const group of groups) expect(anchors.og.has(group.id)).toBe(group.anchored)
    for (const sub of view.subQuestions) expect(anchors.sq.has(sub.id)).toBe(true)
  })

  it('选择类槽位绑定的选项组存在', () => {
    for (const slot of slots) {
      if (slot.mechanism === 'choice' || slot.mechanism === 'pool-assign') {
        expect(groups.some((group) => group.id === slot.optionGroupId)).toBe(true)
      }
    }
  })

  it('每个槽位都有一条参考答案记录，且选项 id 都存在', () => {
    const optionIds = new Set(groups.flatMap((group) => group.options.map((option) => option.id)))
    expect(review.referenceAnswers.map((entry) => entry.slotId).sort()).toEqual(
      slots.map((slot) => slot.id).sort()
    )
    for (const { answer } of review.referenceAnswers) {
      if (answer.kind === 'options') {
        for (const id of answer.optionIds) expect(optionIds.has(id)).toBe(true)
      }
    }
  })

  it('解析段的归属指向存在的小题或槽位', () => {
    for (const segment of review.explanation) {
      if (segment.scope.kind === 'sub-question') {
        const { subQuestionId } = segment.scope
        expect(view.subQuestions.some((sub) => sub.id === subQuestionId)).toBe(true)
      }
      if (segment.scope.kind === 'slot') {
        const { slotId } = segment.scope
        expect(slots.some((slot) => slot.id === slotId)).toBe(true)
      }
    }
  })

  it('作答视图不含参考答案的影子', () => {
    expect(JSON.stringify(view)).not.toMatch(/qml-an|qml-isop|qml-exact|judge=/)
  })
})
