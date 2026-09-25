import type { ReactNode } from 'react'
import { Check, X } from 'lucide-react'

import type { ResponseSlot } from '@/types/question'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { domIdOf, useQuestionRender } from './renderModel'
import { useSlotValue } from './useSlotValue'
import { VerdictMark } from './VerdictMark'

// 行内槽位组件。全部用 span 包裹（display:inline-*），题干 <p> 里不会出现块级元素。

function blankMinWidth(slot: ResponseSlot): string {
  const size = slot.blank?.size ?? 4
  return `${Math.min(Math.max(size, 2), 10) * 0.8}em`
}

function Bracketed({ slot, children }: { slot: ResponseSlot; children: ReactNode }) {
  if (slot.blank?.style !== 'bracket') return <>{children}</>
  return (
    <span className="whitespace-nowrap">
      （{children}）
    </span>
  )
}

/** 静态空位：预览态、unsupported、锚点找不到槽位时使用。 */
export function StaticBlank({ slot, label }: { slot: ResponseSlot | null; label?: string | null }) {
  const text = label ?? slot?.blank?.inlineLabel ?? ''
  const blank = (
    <span
      className="mx-1 inline-block border-b border-zinc-400 text-center align-baseline text-zinc-400"
      style={{ minWidth: slot ? blankMinWidth(slot) : '3em' }}
    >
      {text || '\u00A0'}
    </span>
  )
  return slot ? <Bracketed slot={slot}>{blank}</Bracketed> : blank
}

/** 行内短文本空。镜像层与输入框叠放在同一格，宽度随文字增长，字体继承上下文。 */
export function BlankInput({ slot }: { slot: ResponseSlot }) {
  const { value, setValue, readOnly, mode, result, label } = useSlotValue(slot.id)
  const text = value?.kind === 'text' ? value.text : ''
  const placeholder = slot.blank?.inlineLabel ?? ''

  if (readOnly) {
    return (
      <Bracketed slot={slot}>
        <span
          className={cn(
            'mx-1 inline-flex items-baseline gap-1 border-b px-1 align-baseline',
            result?.verdict === 'incorrect' ? 'border-red-400' : 'border-zinc-400'
          )}
          style={{ minWidth: blankMinWidth(slot) }}
        >
          <span className={cn('whitespace-pre-wrap', !text && 'text-zinc-400')}>
            {text || (mode === 'review' ? '未作答' : placeholder || '\u00A0')}
          </span>
          <VerdictMark verdict={result?.verdict} className="self-center" />
        </span>
      </Bracketed>
    )
  }

  return (
    <Bracketed slot={slot}>
      <span
        className="mx-1 inline-grid align-baseline"
        style={{ minWidth: blankMinWidth(slot) }}
      >
        <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre px-1">
          {text || placeholder || '\u00A0'}
        </span>
        <input
          id={`${domIdOf(slot.id)}-input`}
          name={slot.id}
          type="text"
          aria-label={label}
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) =>
            setValue(event.target.value ? { kind: 'text', text: event.target.value } : null)
          }
          className="col-start-1 row-start-1 w-full min-w-0 rounded-none border-0 border-b border-zinc-400 bg-transparent px-1 text-center text-inherit outline-none placeholder:text-zinc-400 focus:border-zinc-900"
        />
      </span>
    </Bracketed>
  )
}

/** 判断题的对、错符号。作答按钮和复盘文案共用，避免一边是字符、一边是图标。 */
export function JudgeSymbol({ value, className }: { value: boolean; className?: string }) {
  const Icon = value ? Check : X
  return <Icon aria-hidden strokeWidth={2.25} className={cn('size-4 shrink-0', className)} />
}

/** 判断题：对 / 错，再点一次回到未作答。 */
export function JudgeToggle({ slot }: { slot: ResponseSlot }) {
  const { value, setValue, readOnly, result, label } = useSlotValue(slot.id)
  const current = value?.kind === 'judge' ? value.value : null

  return (
    <Bracketed slot={slot}>
      <span className="relative -top-0.5 mx-1 inline-flex items-center gap-1 align-middle">
        <span
          role="radiogroup"
          aria-label={label}
          className="inline-flex items-center gap-0.5 rounded-full border border-zinc-300 p-0.5"
        >
          {([true, false] as const).map((option) => {
            const selected = current === option
            return (
              <button
                key={String(option)}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={option ? '正确' : '错误'}
                disabled={readOnly}
                onClick={() => setValue(selected ? null : { kind: 'judge', value: option })}
                className={cn(
                  'flex size-6 items-center justify-center rounded-full transition-colors',
                  selected ? 'bg-zinc-900 text-white' : 'text-zinc-600',
                  !readOnly && !selected && 'hover:bg-zinc-100',
                  readOnly && 'cursor-default'
                )}
              >
                <JudgeSymbol value={option} className="size-3.5" />
              </button>
            )
          })}
        </span>
        <VerdictMark verdict={result?.verdict} />
      </span>
    </Bracketed>
  )
}

/** 主观长答。首期不评阅，复盘时只对照参考答案。 */
export function EssayInput({ slot }: { slot: ResponseSlot }) {
  const { value, setValue, readOnly, mode, label } = useSlotValue(slot.id)
  const text = value?.kind === 'essay' ? value.text : ''

  if (mode === 'preview') {
    return <span className="mt-3 block h-20 rounded-xl border border-dashed border-zinc-300" />
  }
  if (readOnly) {
    return (
      <span className="mt-3 block rounded-xl border border-zinc-200 bg-white/60 px-4 py-3 text-[15px] leading-7">
        <span className="block text-xs text-zinc-400">你的作答</span>
        <span className={cn('block whitespace-pre-wrap', !text && 'text-zinc-400')}>
          {text || '未作答'}
        </span>
      </span>
    )
  }
  return (
    <span className="mt-3 block">
      <Textarea
        id={`${domIdOf(slot.id)}-input`}
        name={slot.id}
        aria-label={label}
        value={text}
        placeholder="写下你的解答"
        onChange={(event) =>
          setValue(event.target.value ? { kind: 'essay', text: event.target.value } : null)
        }
        className="min-h-32 resize-y rounded-xl border-zinc-200 bg-transparent px-4 py-3 text-[16px] leading-7 shadow-none focus-visible:border-zinc-900 focus-visible:ring-0 md:text-[16px]"
      />
    </span>
  )
}

/**
 * 完形填空式的行内空：答案在小题的选项行里选，空里只回显字母。点击跳到对应选项行。
 */
export function ChoiceBlankChip({ slot }: { slot: ResponseSlot }) {
  const model = useQuestionRender()
  const { value, result, label } = useSlotValue(slot.id)
  const group = slot.optionGroupId ? model.groupsById.get(slot.optionGroupId) : undefined
  const chosen = value?.kind === 'choice' ? value.optionIds : []
  const text = chosen
    .map((id) => group?.options.find((option) => option.id === id)?.label ?? '?')
    .join('')

  const focusGroup = () => {
    if (!group) return
    const target = document.getElementById(domIdOf(group.id))
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    target?.querySelector<HTMLElement>('[data-option-control]')?.focus({ preventScroll: true })
  }

  return (
    <Bracketed slot={slot}>
      <button
        type="button"
        onClick={focusGroup}
        aria-label={`${label}${text ? `，已选 ${text}` : '，未作答'}`}
        className={cn(
          'mx-1 inline-flex items-baseline justify-center gap-1 border-b px-1 align-baseline transition-colors hover:bg-zinc-100',
          result?.verdict === 'incorrect' ? 'border-red-400' : 'border-zinc-500'
        )}
        style={{ minWidth: blankMinWidth(slot) }}
      >
        <span className={cn(!text && 'text-zinc-400')}>{text || slot.blank?.inlineLabel || '\u00A0'}</span>
        <VerdictMark verdict={result?.verdict} className="self-center" />
      </button>
    </Bracketed>
  )
}
