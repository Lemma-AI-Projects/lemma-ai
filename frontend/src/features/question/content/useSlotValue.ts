import { useCallback } from 'react'

import type { SlotResponse } from '@/types/question'
import {
  useSetSlotResponse,
  useSlotResponse,
  useUpdateSlotResponse,
} from '../attempt/useAttempt'
import { useQuestionRender } from './renderModel'

/**
 * 槽位当前应显示的值：作答态读本地草稿；复盘态读后端回显的作答（没有回显时
 * 退回草稿）；预览态没有值。
 */
export function useSlotValue(slotId: string) {
  const model = useQuestionRender()
  const draft = useSlotResponse(slotId)
  const setDraft = useSetSlotResponse()
  const updateDraft = useUpdateSlotResponse()
  const result = model.results.get(slotId) ?? null

  const value: SlotResponse | null =
    model.mode === 'preview' ? null : model.mode === 'review' ? (result?.response ?? draft) : draft

  const setValue = useCallback(
    (response: SlotResponse | null) => setDraft(slotId, response),
    [setDraft, slotId]
  )
  const updateValue = useCallback(
    (updater: (current: SlotResponse | null) => SlotResponse | null) => updateDraft(slotId, updater),
    [updateDraft, slotId]
  )

  return {
    value,
    setValue,
    updateValue,
    readOnly: model.readOnly,
    mode: model.mode,
    result,
    reference: model.references.get(slotId) ?? null,
    label: model.slotLabels.get(slotId) ?? '作答',
  }
}
