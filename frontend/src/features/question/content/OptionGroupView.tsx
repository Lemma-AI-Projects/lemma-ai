import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Check, X } from 'lucide-react'

import { RichHtml } from '@/components/RichHtml'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import type { OptionGroup, QuestionOption, ResponseSlot, SlotResponse } from '@/types/question'
import { useAttemptResponses } from '../attempt/useAttempt'
import { domIdOf, useQuestionRender } from './renderModel'
import { useSlotValue } from './useSlotValue'

// 选项卡片的高度、内边距、圆角与 hover 高亮。
const optionCardClassName =
  'flex min-h-[48px] w-full items-center gap-3.5 rounded-[12px] border border-zinc-200 bg-transparent px-3.5 py-2.5 text-left shadow-none transition-[border-color,background-color] duration-150 ease-out'
const optionCardInteractiveClassName = 'cursor-pointer hover:border-zinc-300 hover:bg-zinc-100/60'
const optionCardSelectedClassName = 'border-zinc-500 bg-zinc-100 hover:border-zinc-500 hover:bg-zinc-100'
const optionCardCorrectClassName = 'border-emerald-500/70 bg-emerald-50/70'
const optionCardWrongClassName = 'border-red-400 bg-red-50/70'
const optionRadioClassName =
  'size-4 border-zinc-300 bg-transparent text-white !shadow-none transition-none focus-visible:ring-2 focus-visible:ring-zinc-300/70 data-[state=checked]:border-zinc-900 data-[state=checked]:bg-zinc-900 [&_svg]:size-2 [&_svg]:fill-white'
const optionIndicatorClassName =
  'flex size-4 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-transparent'
const optionIndicatorSelectedClassName = 'border-zinc-900 bg-zinc-900'

// 自动分列：优先按原卷 cols，放不下再降到 2 列、1 列。
// 卡片内部固定占位 = 边框 + 左右内边距 + 圆点 + 间距 + 字母标签；列间距与 gap-2.5 一致。
const OPTION_RESERVED_PX = 92
const COLUMN_GAP_PX = 10
const MIN_COLUMN_PX = 120

// 选项组作为小题（或片段）的第一个元素时不留顶部间距，和题号对齐。
const optionGroupWrapperClassName = 'mt-6 first:mt-0'

function useOptionColumns(group: OptionGroup) {
  const ref = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)
  const maxColumns = Math.max(1, Math.min(group.cols ?? 4, group.options.length, 4))

  useLayoutEffect(() => {
    const container = ref.current
    if (!container || maxColumns <= 1) return

    // 富文本选项没法纯文本测宽：量渲染后的自然宽度（临时禁止换行）。
    const measure = () => {
      const width = container.clientWidth
      const widest = Math.max(
        0,
        ...Array.from(container.querySelectorAll<HTMLElement>('[data-option-content]')).map(
          (element) => {
            const previous = element.style.whiteSpace
            element.style.whiteSpace = 'nowrap'
            const natural = element.scrollWidth
            element.style.whiteSpace = previous
            return natural
          }
        )
      )
      const candidates = [maxColumns, 2, 1].filter(
        (count, index, list) => count <= maxColumns && list.indexOf(count) === index
      )
      return (
        candidates.find((count) => {
          if (count === 1) return true
          const columnWidth = (width - COLUMN_GAP_PX * (count - 1)) / count
          return columnWidth >= MIN_COLUMN_PX && widest + OPTION_RESERVED_PX <= columnWidth
        }) ?? 1
      )
    }

    let frame = window.requestAnimationFrame(() => setColumns(measure()))
    if (typeof ResizeObserver === 'undefined') {
      return () => window.cancelAnimationFrame(frame)
    }
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => setColumns(measure()))
    })
    observer.observe(container)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [maxColumns])

  const style: CSSProperties = {
    gridTemplateColumns: `repeat(${maxColumns <= 1 ? 1 : columns}, minmax(0, 1fr))`,
  }
  return { ref, style }
}

function OptionText({ option }: { option: QuestionOption }) {
  return (
    <span className="flex min-w-0 items-baseline gap-2 text-[16px] leading-7 text-zinc-900">
      <span className="shrink-0 text-zinc-500">{option.label}.</span>
      <span data-option-content className="inline-block min-w-0 max-w-full">
        <RichHtml as="span" html={option.content.html} className="block" />
      </span>
    </span>
  )
}

function StaticIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(optionIndicatorClassName, selected && optionIndicatorSelectedClassName)}
    >
      {selected ? <span className="size-2 rounded-full bg-white" /> : null}
    </span>
  )
}

function ChoiceOptions({ slot, group }: { slot: ResponseSlot; group: OptionGroup }) {
  const { value, setValue, updateValue, readOnly, reference, label } = useSlotValue(slot.id)
  const { ref, style } = useOptionColumns(group)
  const selected = value?.kind === 'choice' ? value.optionIds : []
  const correctIds = reference?.kind === 'options' ? reference.optionIds : null
  const single = slot.select === 'single'

  const toggle = (optionId: string) => {
    updateValue((current) => {
      const chosen = current?.kind === 'choice' ? current.optionIds : []
      const next = chosen.includes(optionId)
        ? chosen.filter((id) => id !== optionId)
        : [...chosen, optionId]
      return next.length > 0 ? { kind: 'choice', optionIds: next } : null
    })
  }

  const hint =
    slot.select === 'unknown' && !readOnly ? (
      <p className="mb-2 text-xs text-zinc-500">本题可能有多个正确选项，可多选。</p>
    ) : null

  if (readOnly) {
    return (
      <div id={domIdOf(group.id)} className={optionGroupWrapperClassName}>
        <div ref={ref} role="list" aria-label={label} className="grid gap-2.5" style={style}>
          {group.options.map((option) => {
            const isSelected = selected.includes(option.id)
            const isCorrect = correctIds?.includes(option.id) ?? false
            const isWrong = isSelected && correctIds !== null && !isCorrect
            return (
              <div
                key={option.id}
                role="listitem"
                className={cn(
                  optionCardClassName,
                  isSelected && optionCardSelectedClassName,
                  isCorrect && optionCardCorrectClassName,
                  isWrong && optionCardWrongClassName
                )}
              >
                <StaticIndicator selected={isSelected} />
                <OptionText option={option} />
                <span className="ml-auto flex shrink-0 items-center gap-1 text-xs">
                  {isSelected && isCorrect ? <Check aria-label="选对" className="size-4 text-emerald-600" /> : null}
                  {isWrong ? <X aria-label="选错" className="size-4 text-red-500" /> : null}
                  {!isSelected && isCorrect ? <span className="text-emerald-700">正确答案</span> : null}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (single) {
    return (
      <div id={domIdOf(group.id)} className={optionGroupWrapperClassName}>
        <div ref={ref}>
          <RadioGroup
            value={selected[0] ?? ''}
            onValueChange={(optionId) => setValue({ kind: 'choice', optionIds: [optionId] })}
            aria-label={label}
            className="grid gap-2.5"
            style={style}
          >
            {group.options.map((option) => {
              const elementId = `${domIdOf(option.id)}-control`
              return (
                <label
                  key={option.id}
                  htmlFor={elementId}
                  className={cn(
                    optionCardClassName,
                    optionCardInteractiveClassName,
                    selected.includes(option.id) && optionCardSelectedClassName
                  )}
                >
                  <RadioGroupItem
                    id={elementId}
                    value={option.id}
                    data-option-control
                    className={optionRadioClassName}
                  />
                  <OptionText option={option} />
                </label>
              )
            })}
          </RadioGroup>
        </div>
      </div>
    )
  }

  return (
    <div id={domIdOf(group.id)} className={optionGroupWrapperClassName}>
      {hint}
      <div ref={ref} role="group" aria-label={label} className="grid gap-2.5" style={style}>
        {group.options.map((option) => {
          const isSelected = selected.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              data-option-control
              onClick={() => toggle(option.id)}
              className={cn(
                optionCardClassName,
                optionCardInteractiveClassName,
                isSelected && optionCardSelectedClassName
              )}
            >
              <StaticIndicator selected={isSelected} />
              <OptionText option={option} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function poolResponseOf(response: SlotResponse | null | undefined): string | null {
  return response?.kind === 'pool-assign' ? response.optionId : null
}

/** 七选五的共享选项池：选项本身不可点，在空里指派；这里标出每个选项被哪个空用了。 */
function PoolOptions({ group, slots }: { group: OptionGroup; slots: readonly ResponseSlot[] }) {
  const model = useQuestionRender()
  const drafts = useAttemptResponses()
  const { ref, style } = useOptionColumns(group)

  const usedBy = new Map<string, string[]>()
  for (const slot of slots) {
    const response =
      model.mode === 'review' ? (model.results.get(slot.id)?.response ?? drafts[slot.id]) : drafts[slot.id]
    const optionId = model.mode === 'preview' ? null : poolResponseOf(response)
    if (!optionId) continue
    const names = usedBy.get(optionId) ?? []
    names.push(slot.blank?.inlineLabel ?? model.slotLabels.get(slot.id) ?? '')
    usedBy.set(optionId, names)
  }

  return (
    <div id={domIdOf(group.id)} className={optionGroupWrapperClassName}>
      <p className="mb-2 text-xs text-zinc-500">
        {group.reuse === 'exclusive'
          ? '点击文中的空，从下列选项中选择；每个选项只能用一次。'
          : '点击文中的空，从下列选项中选择。'}
      </p>
      <div ref={ref} role="list" className="grid gap-2.5" style={style}>
        {group.options.map((option) => {
          const names = usedBy.get(option.id) ?? []
          return (
            <div
              key={option.id}
              role="listitem"
              className={cn(optionCardClassName, names.length > 0 && 'border-zinc-300 bg-zinc-100/70')}
            >
              <OptionText option={option} />
              {names.length > 0 ? (
                <span className="ml-auto shrink-0 text-xs text-zinc-500">已填入 {names.join('、')}</span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StaticOptions({ group }: { group: OptionGroup }) {
  const { ref, style } = useOptionColumns(group)
  return (
    <div id={domIdOf(group.id)} className={optionGroupWrapperClassName}>
      <div ref={ref} role="list" className="grid gap-2.5" style={style}>
        {group.options.map((option) => (
          <div key={option.id} role="listitem" className={optionCardClassName}>
            <StaticIndicator selected={false} />
            <OptionText option={option} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** 选项组：按绑定槽位决定是普通选择、共享池还是静态列表。 */
export function OptionGroupView({ groupId }: { groupId: string }) {
  const model = useQuestionRender()
  const group = model.groupsById.get(groupId)
  if (!group) return null

  const bound = model.slotsByGroup.get(groupId) ?? []
  if (group.reuse !== null || bound.some((slot) => slot.mechanism === 'pool-assign')) {
    return <PoolOptions group={group} slots={bound} />
  }
  const choiceSlot = bound.find((slot) => slot.mechanism === 'choice')
  if (choiceSlot && model.mode !== 'preview') {
    return <ChoiceOptions slot={choiceSlot} group={group} />
  }
  return <StaticOptions group={group} />
}
