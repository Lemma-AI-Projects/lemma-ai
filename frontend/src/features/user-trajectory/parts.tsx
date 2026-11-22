import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { EPISTEMIC, refOf } from './data'
import { truncate } from './kit'
import { EpiMark, SectionRule } from './marks'
import type { RefType } from './data'
import type { Store } from './store'
import type { Epistemic } from './types'

/**
 * 零件。颜色**只用产品那套 zinc**：`bg-zinc-100 / bg-zinc-50 / bg-white`、`text-zinc-950 / 500 / 400`、
 * `border-zinc-200`，加上 `dark:` 对应值 —— 和 `AppLayout` / `LearnSpacesView` 是同一套词汇。
 *
 * v3 曾借用启示页的「纸与墨」（暖纸 + 赭）。那是**另一套语言**，只属于启示页；
 * 搬到任何产品页面上都会显得像另一个产品。v5 全部撤掉。
 *
 * 唯一的彩色是信号色 **amber**：反驳、被收窄、候选刚浮出来。结构（选中、当前、编号、计数）一律 zinc。
 *
 * 字符记号全部换成了 SVG —— 见 `marks.tsx` 顶部的原因。
 * 尺度六档：9.5（页眉小字）· 10（标签/元信息）· 12（正文）· 12.5（行标题）· 17（衬线标题）· 27（首页大标题）。
 */

/** 分节标签。前面一小段菱形加细线，代替一整条边框。 */
export function Label({ children, className, plain }: { children: ReactNode; className?: string; plain?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 text-[10px] tracking-[0.1em] text-zinc-400 dark:text-zinc-500', className)}>
      {plain ? null : <SectionRule />}
      <span>{children}</span>
    </div>
  )
}

/** 一条分隔线。tone=strong 用于分节，hair 用于行间。 */
export function Rule({ className, strong }: { className?: string; strong?: boolean }) {
  return <div className={cn('h-px w-full', strong ? 'bg-zinc-900/15 dark:bg-zinc-100/15' : 'bg-zinc-200 dark:bg-zinc-800', className)} />
}

/** 四态：记号 + 文字。文字可以关掉。 */
export function EpistemicMark({
  value,
  compact,
  className,
}: {
  value: Epistemic
  compact?: boolean
  className?: string
}) {
  const e = EPISTEMIC[value]
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] text-zinc-400 dark:text-zinc-500', className)}
      title={e.hint}
    >
      <EpiMark value={value} />
      {compact ? null : <span className="tracking-[0.04em]">{e.label}</span>}
    </span>
  )
}

/**
 * 行内引用。全页唯一的「跳转」形态：文字下一条虚线，鼠标过去变实并加深。
 */
export function RefLink({
  s,
  id,
  type,
  children,
  className,
}: {
  s: Store
  id: string
  type?: RefType
  children?: ReactNode
  className?: string
}) {
  const ref = refOf(id)
  if (!ref) return <span>{children ?? id}</span>
  const text = children ?? (ref.type === 'object' ? ref.label : truncate(ref.label, 26))
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        s.select(id, type ?? ref.type)
      }}
      className={cn(
        'inline text-left underline decoration-zinc-300 dark:decoration-zinc-700 decoration-dotted underline-offset-[3px] transition-colors hover:text-zinc-950 dark:hover:text-zinc-50 hover:decoration-zinc-900/50 dark:hover:decoration-zinc-100/50',
        className,
      )}
    >
      {text}
    </button>
  )
}

/**
 * 一行可选中的东西。全页只有这一种选中态：左侧 2px 近黑实线 + 一档浅灰底
 * —— 和 `SidebarItem` 的 `bg-zinc-200/80` 同一个思路，不用彩色。
 */
export function Row({
  selected,
  onClick,
  children,
  className,
  as = 'button',
  dim,
}: {
  selected?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
  as?: 'button' | 'div'
  dim?: boolean
}) {
  const cls = cn(
    'group relative block w-full border-l-2 py-2 pr-2 pl-3 text-left transition-colors duration-150',
    selected
      ? 'border-zinc-900 bg-zinc-200/70 dark:border-zinc-100 dark:bg-zinc-800/60'
      : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-900/[0.04] dark:hover:bg-zinc-100/[0.04]',
    dim && 'opacity-55',
    className,
  )
  if (as === 'div') {
    return (
      <div className={cls} onClick={onClick}>
        {children}
      </div>
    )
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  )
}

/** 行内文字动作。 */
export function TextAction({
  children,
  onClick,
  className,
  muted,
}: {
  children: ReactNode
  onClick: () => void
  className?: string
  muted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'inline-flex items-center gap-1 text-[11px] whitespace-nowrap transition-colors',
        muted
          ? 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50'
          : 'text-zinc-950 dark:text-zinc-50 underline decoration-zinc-400/60 dark:decoration-zinc-500/60 underline-offset-[3px] hover:decoration-zinc-900/50 dark:hover:decoration-zinc-100/50',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Quiet({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[12px] leading-[1.85] text-zinc-500 dark:text-zinc-400', className)}>{children}</p>
}
