import type { ResponseSlot, SlotResponse, SlotVerdict } from '@/types/question'
import type { QuestionRenderModel } from './renderModel'

export function optionLabelOf(model: QuestionRenderModel, optionId: string): string {
  for (const group of model.groupsById.values()) {
    const option = group.options.find((candidate) => candidate.id === optionId)
    if (option) return option.label
  }
  return '?'
}

/** 作答回显的纯文本形式；null 表示未作答。 */
export function formatResponse(
  model: QuestionRenderModel,
  response: SlotResponse | null | undefined
): string | null {
  if (!response) return null
  switch (response.kind) {
    case 'choice':
      return response.optionIds.length > 0
        ? response.optionIds.map((id) => optionLabelOf(model, id)).join('')
        : null
    case 'pool-assign':
      return response.optionId ? optionLabelOf(model, response.optionId) : null
    case 'judge':
      return response.value === null ? null : response.value ? '√' : '×'
    case 'text':
    case 'essay':
      return response.text.trim() ? response.text : null
  }
}

export function verdictText(slot: ResponseSlot, verdict: SlotVerdict | undefined): string {
  switch (verdict) {
    case 'correct':
      return '正确'
    case 'incorrect':
      return '错误'
    case 'partial':
      return '部分正确'
    case 'pending':
      return '评阅中'
    case 'unanswered':
      return '未作答'
    case 'not-graded':
      return slot.mechanism === 'essay' ? '主观题 · 不计分' : '不评阅'
    default:
      return '未提交'
  }
}

/** 片段里有没有可见内容（文字或媒体）；空的解析段不渲染。 */
export function hasVisibleContent(html: string): boolean {
  if (/<(img|math|audio|video|table)\b/i.test(html)) return true
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;|\s|\u00a0/g, '').length > 0
}
