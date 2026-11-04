import type { MouseEvent, ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { EPISTEMIC } from './data'
import type { Epistemic } from './types'

/**
 * 这一页的零件。刻意只有六个，而且都没有阴影、没有圆角渐变、没有动画。
 * 低保证的目的：让评审时争论的是结构，不是样式。
 */

export function Section({
  label,
  hint,
  right,
  children,
  className,
}: {
  label: string
  hint?: string
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('border-t border-border pt-4 first:border-t-0 first:pt-0', className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</h2>
          {hint ? <span className="text-[11px] text-muted-foreground/70">{hint}</span> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

/** 四态记号。● 观察到 / ◐ 系统解释 / ○ 假设 / ◆ 他自己说的 */
export function EpistemicMark({
  value,
  withLabel = true,
  className,
}: {
  value: Epistemic
  withLabel?: boolean
  className?: string
}) {
  const e = EPISTEMIC[value]
  return (
    <span className={cn('inline-flex items-baseline gap-1 whitespace-nowrap text-[11px]', className)} title={e.hint}>
      <span aria-hidden className="text-[10px] leading-none">
        {e.glyph}
      </span>
      {withLabel ? <span className="text-muted-foreground">{e.label}</span> : null}
    </span>
  )
}

export function Chip({
  children,
  onClick,
  active,
  title,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  title?: string
  className?: string
}) {
  const base = 'inline-flex max-w-full items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] leading-4'
  if (!onClick) {
    return <span className={cn(base, 'border-border text-muted-foreground', className)}>{children}</span>
  }
  return (
    <button
      type="button"
      title={title}
      onClick={(ev) => {
        ev.stopPropagation()
        onClick()
      }}
      className={cn(
        base,
        'truncate transition-colors',
        active
          ? 'border-foreground/40 bg-muted text-foreground'
          : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** 一行可选中的东西。左侧细线表示选中，不用底色块。 */
export function SelectRow({
  selected,
  onClick,
  onContextMenu,
  children,
  className,
  as = 'button',
}: {
  selected?: boolean
  onClick?: () => void
  onContextMenu?: (e: MouseEvent) => void
  children: ReactNode
  className?: string
  as?: 'button' | 'div'
}) {
  const cls = cn(
    'group relative w-full border-l-2 py-1.5 pr-2 pl-3 text-left transition-colors',
    selected ? 'border-foreground bg-muted/60' : 'border-transparent hover:border-border hover:bg-muted/30',
    className,
  )
  if (as === 'div') {
    return (
      <div className={cls} onClick={onClick} onContextMenu={onContextMenu}>
        {children}
      </div>
    )
  }
  return (
    <button type="button" className={cls} onClick={onClick} onContextMenu={onContextMenu}>
      {children}
    </button>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-[12px] leading-5 text-muted-foreground">{children}</p>
}

export function KeyValue({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-2 py-1 text-[12px] leading-5">
      <div className="text-muted-foreground">{k}</div>
      <div className="min-w-0 text-foreground/90">{children}</div>
    </div>
  )
}
