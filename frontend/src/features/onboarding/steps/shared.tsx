/**
 * 各屏共用的原语。
 *
 * 全部走仓库现有的 token 与 Tailwind，不引入新配色、不引入新依赖。
 */

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import type { OnboardingDraft } from '../types'

/** 每一屏拿到的 props。屏自己决定怎么推进（评估屏一触即走）。 */
export interface StepProps {
  draft: OnboardingDraft
  patch: (patch: Partial<OnboardingDraft>) => void
  next: () => void
}

export function StepHeading({
  title,
  hint,
}: {
  title: string
  hint?: string
}) {
  return (
    <div className="mb-8">
      <h1 className="text-[26px] font-semibold leading-9 tracking-tight text-zinc-950">
        {title}
      </h1>
      {hint ? (
        <p className="mt-3 text-[14px] leading-6 text-zinc-500">{hint}</p>
      ) : null}
    </div>
  )
}

/** 一个大卡片选项。选中态用主色描边，不引入第二个强调色。 */
export function OptionCard({
  selected,
  title,
  hint,
  onClick,
}: {
  selected: boolean
  title: string
  hint?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'w-full rounded-xl border px-4 py-3.5 text-left transition-colors',
        selected
          ? 'border-primary bg-accent'
          : 'border-border hover:border-zinc-300 hover:bg-accent/40'
      )}
    >
      <div className="text-[15px] font-medium text-zinc-900">{title}</div>
      {hint ? (
        <div className="mt-1 text-[13px] leading-5 text-zinc-500">{hint}</div>
      ) : null}
    </button>
  )
}

/** 可点的小标签，用于开放输入旁边的建议。 */
export function SuggestionChip({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border px-3 py-1.5 text-[13px] text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-accent/40 hover:text-zinc-900"
    >
      {children}
    </button>
  )
}

/** 多选标签：选中用主色实心。 */
export function ToggleChip({
  selected,
  children,
  onClick,
}: {
  selected: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-full border px-3.5 py-2 text-[13px] transition-colors',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-zinc-600 hover:border-zinc-300 hover:bg-accent/40 hover:text-zinc-900'
      )}
    >
      {children}
    </button>
  )
}