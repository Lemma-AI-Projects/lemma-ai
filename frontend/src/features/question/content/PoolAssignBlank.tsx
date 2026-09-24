import { useState } from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'

import { RichHtml } from '@/components/RichHtml'
import { cn } from '@/lib/utils'
import type { ResponseSlot } from '@/types/question'
import { useAttemptResponses } from '../attempt/useAttempt'
import { useQuestionRender } from './renderModel'
import { useSlotValue } from './useSlotValue'
import { VerdictMark } from './VerdictMark'

/**
 * 共享选项池的行内空（七选五）。数据是"空 → 选项"的映射，不是选项集合，
 * 所以不复用多选控件。选项是否可以被多个空重复使用，由后端的 reuse 决定。
 */
export function PoolAssignBlank({ slot }: { slot: ResponseSlot }) {
  const model = useQuestionRender()
  const drafts = useAttemptResponses()
  const { value, setValue, readOnly, result, label } = useSlotValue(slot.id)
  const [open, setOpen] = useState(false)
  const group = slot.optionGroupId ? model.groupsById.get(slot.optionGroupId) : undefined

  const chosenId = value?.kind === 'pool-assign' ? value.optionId : null
  const chosen = group?.options.find((option) => option.id === chosenId)
  const inlineLabel = slot.blank?.inlineLabel ?? ''

  const chip = (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-xs text-zinc-400">{inlineLabel}</span>
      <span className={cn(!chosen && 'text-zinc-400')}>{chosen ? chosen.label : '选择'}</span>
    </span>
  )
  const chipClassName = cn(
    'mx-1 inline-flex min-w-[4.5em] items-baseline justify-center gap-1 border-b px-2 align-baseline',
    result?.verdict === 'incorrect' ? 'border-red-400' : 'border-zinc-500'
  )

  if (readOnly || !group) {
    return (
      <span className={chipClassName} aria-label={`${label}${chosen ? `，已选 ${chosen.label}` : '，未作答'}`}>
        {chip}
        <VerdictMark verdict={result?.verdict} className="self-center" />
      </span>
    )
  }

  const usedBy = new Map<string, string>()
  for (const other of model.slotsByGroup.get(group.id) ?? []) {
    if (other.id === slot.id) continue
    const response = drafts[other.id]
    if (response?.kind === 'pool-assign' && response.optionId) {
      usedBy.set(response.optionId, other.blank?.inlineLabel ?? model.slotLabels.get(other.id) ?? '')
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`${label}${chosen ? `，已选 ${chosen.label}` : '，未作答'}`}
          className={cn(chipClassName, 'transition-colors hover:bg-zinc-100')}
        >
          {chip}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 max-h-[min(420px,var(--radix-popover-content-available-height))] w-[min(440px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-zinc-200 bg-popover p-1.5 text-popover-foreground shadow-lg outline-hidden"
        >
          <div role="listbox" aria-label={`${label} 的可选项`} className="flex flex-col gap-0.5">
            {group.options.map((option) => {
              const used = usedBy.get(option.id)
              const disabled = group.reuse === 'exclusive' && used !== undefined
              const selected = option.id === chosenId
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={disabled}
                  onClick={() => {
                    setValue({ kind: 'pool-assign', optionId: option.id })
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-baseline gap-2 rounded-lg px-2.5 py-2 text-left text-[15px] leading-6 transition-colors',
                    selected ? 'bg-zinc-100' : 'hover:bg-zinc-100/70',
                    disabled && 'cursor-not-allowed opacity-45 hover:bg-transparent'
                  )}
                >
                  <span className="shrink-0 text-zinc-500">{option.label}.</span>
                  <RichHtml as="span" html={option.content.html} className="min-w-0 flex-1" />
                  {used !== undefined ? (
                    <span className="shrink-0 text-xs text-zinc-400">已用于 {used}</span>
                  ) : null}
                </button>
              )
            })}
            {chosenId ? (
              <button
                type="button"
                onClick={() => {
                  setValue(null)
                  setOpen(false)
                }}
                className="mt-1 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-100/70"
              >
                清除本空
              </button>
            ) : null}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
