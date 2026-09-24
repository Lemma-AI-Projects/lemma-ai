import { createContext, useContext } from 'react'

import type {
  AttemptResult,
  OptionGroup,
  QuestionReview,
  QuestionView,
  ReferenceAnswer,
  ResponseSlot,
  SlotResult,
  SubQuestion,
} from '@/types/question'

/** answer = 受控作答；review = 只读回显 + 对错 + 参考答案/解析；preview = 静态题面。 */
export type QuestionPlayerMode = 'answer' | 'review' | 'preview'

export interface QuestionRenderModel {
  question: QuestionView
  mode: QuestionPlayerMode
  slotsById: ReadonlyMap<string, ResponseSlot>
  groupsById: ReadonlyMap<string, OptionGroup>
  subsById: ReadonlyMap<string, SubQuestion>
  /** 槽位归属：null = 顶层 */
  slotOwner: ReadonlyMap<string, SubQuestion | null>
  /** 绑定到某个选项组的槽位（普通选择题 1 个；共享池多个） */
  slotsByGroup: ReadonlyMap<string, readonly ResponseSlot[]>
  /** 槽位的可读名称（可访问名称、复盘列表共用），只用于展示 */
  slotLabels: ReadonlyMap<string, string>
  results: ReadonlyMap<string, SlotResult>
  references: ReadonlyMap<string, ReferenceAnswer>
  review: QuestionReview | null
  /** 显示时禁止交互（review / preview / 已提交） */
  readOnly: boolean
}

export const QuestionRenderContext = createContext<QuestionRenderModel | null>(null)

export function useQuestionRender(): QuestionRenderModel {
  const model = useContext(QuestionRenderContext)
  if (!model) throw new Error('useQuestionRender must be used within QuestionPlayer')
  return model
}

/** 把契约 id 转成合法且稳定的 DOM id。 */
export function domIdOf(id: string): string {
  return `question-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function subName(sub: SubQuestion, numbering: QuestionView['numbering']): string {
  const label = sub.label.trim().replace(/[.．、\s]+$/, '')
  if (numbering === 'per-question') return `小问${label}`
  return /^\d+$/.test(label) ? `第 ${label} 题` : label
}

function labelSlots(question: QuestionView): Map<string, string> {
  const labels = new Map<string, string>()
  question.slots.forEach((slot, index) => {
    if (question.slots.length === 1) {
      labels.set(slot.id, '本题')
    } else {
      labels.set(slot.id, `第 ${slot.blank?.inlineLabel ?? index + 1} 空`)
    }
  })
  for (const sub of question.subQuestions) {
    const name = subName(sub, question.numbering)
    sub.slots.forEach((slot, index) => {
      labels.set(slot.id, sub.slots.length === 1 ? name : `${name} 第 ${index + 1} 空`)
    })
  }
  return labels
}

export function buildRenderModel(
  question: QuestionView,
  mode: QuestionPlayerMode,
  result: AttemptResult | null
): QuestionRenderModel {
  const slotsById = new Map<string, ResponseSlot>()
  const slotOwner = new Map<string, SubQuestion | null>()
  const groupsById = new Map<string, OptionGroup>()
  const subsById = new Map<string, SubQuestion>()

  for (const slot of question.slots) {
    slotsById.set(slot.id, slot)
    slotOwner.set(slot.id, null)
  }
  for (const group of question.optionGroups) groupsById.set(group.id, group)
  for (const sub of question.subQuestions) {
    subsById.set(sub.id, sub)
    for (const slot of sub.slots) {
      slotsById.set(slot.id, slot)
      slotOwner.set(slot.id, sub)
    }
    for (const group of sub.optionGroups) groupsById.set(group.id, group)
  }

  const slotsByGroup = new Map<string, ResponseSlot[]>()
  for (const slot of slotsById.values()) {
    if (!slot.optionGroupId) continue
    const bound = slotsByGroup.get(slot.optionGroupId) ?? []
    bound.push(slot)
    slotsByGroup.set(slot.optionGroupId, bound)
  }

  const review = mode === 'review' ? (result?.review ?? null) : null

  return {
    question,
    mode,
    slotsById,
    groupsById,
    subsById,
    slotOwner,
    slotsByGroup,
    slotLabels: labelSlots(question),
    results: new Map(mode === 'review' ? (result?.slots ?? []).map((slot) => [slot.slotId, slot]) : []),
    references: new Map((review?.referenceAnswers ?? []).map((entry) => [entry.slotId, entry.answer])),
    review,
    readOnly: mode !== 'answer',
  }
}
