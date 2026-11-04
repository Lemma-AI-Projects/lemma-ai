import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { EPISTEMIC, refOf } from './data'
import { truncate } from './kit'
import type { RefType } from './data'
import type { Store } from './store'
import type { Epistemic } from './types'

/**
 * 整页的视觉尺度只有这几档。不许在组件里再发明字号。
 *
 *   10  标签 / 元信息
 *   12  列表正文
 *   13  强调正文（行标题、段落）
 *   15  衬线：右栏标题
 *   20  衬线：首页发现的标题
 *
 * 衬线只用在**引文性质**的地方（一句判断、一条发现），界面文字一律无衬线。
 * 这条规则就是「编辑感」的全部来源，不靠边框和卡片。
 */
/** 一条极细的分隔线。比 border 更安静，用来分组而不是画框。 */
export function Rule({ className }: { className?: string }) {
  return <div className={cn('h-px bg-border/70', className)} />
}

/** 分节标签。中文不适合大字距，只留 0.08em。 */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('text-[10px] tracking-[0.08em] text-muted-foreground', className)}>{children}</div>
}

/** 四态记号。形状本身就区分了含义，不依赖颜色。 */
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
    <span className={cn('inline-flex items-baseline gap-1 whitespace-nowrap text-[10px] text-muted-foreground', className)}>
      <span aria-hidden className="leading-none">
        {e.glyph}
      </span>
      {compact ? null : <span>{e.label}</span>}
    </span>
  )
}

/**
 * 行内引用。正文里提到一个对象时用它 —— 点得动，但不做成按钮块。
 * 这是全页唯一的「跳转」形态：文字下面一条虚线，鼠标过去变实。
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
        'inline text-left underline decoration-border decoration-dotted underline-offset-[3px] hover:decoration-foreground',
        className,
      )}
    >
      {text}
    </button>
  )
}

/**
 * 一行可选中的东西。全页只有这一种选中态：左侧 2px 实线 + 极浅底。
 * 不再有「深色块」「整行反白」这些第二种写法。
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
    'group block w-full border-l-2 py-1.5 pr-2 pl-2.5 text-left transition-colors',
    selected
      ? 'border-foreground bg-muted/60'
      : 'border-transparent hover:border-border hover:bg-muted/30',
    dim && 'opacity-60',
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

/** 行内的小号文字链接（动作）。用于「走过去 →」这类。 */
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
        'text-[11px] underline decoration-border underline-offset-[3px] hover:decoration-foreground',
        muted ? 'text-muted-foreground hover:text-foreground' : 'text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Quiet({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[12px] leading-[1.7] text-muted-foreground', className)}>{children}</p>
}

