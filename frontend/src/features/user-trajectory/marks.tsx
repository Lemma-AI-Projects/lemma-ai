import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import type { Discovery, DevEvent, Epistemic } from './types'

/**
 * 这一页的全部图形。
 *
 * 为什么不用字符（● ◐ ○ ◆ ▸ → ×）：一套 10–12px 的 Unicode 记号在不同字体里
 * 大小、粗细、基线都对不齐，紧挨着中文时尤其明显 —— 那是"廉价感"最直接的来源。
 * 这里全部改成定尺寸 SVG：同一套线宽（1.1–1.25）、同一个 12/22 画布、
 * 颜色一律 `currentColor`，跟着文字变。
 */

type SvgProps = { size?: number; className?: string }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 12 12',
  fill: 'none' as const,
  'aria-hidden': true,
})

/** 四态：实心点 / 半月 / 虚线圈 / 菱形。形状本身就是含义，不靠颜色。 */
export function EpiMark({ value, size = 13, className }: SvgProps & { value: Epistemic }) {
  const p = { ...base(size), className: cn('shrink-0', className) }
  if (value === 'observed') {
    return (
      <svg {...p}>
        <circle cx="6" cy="6" r="2.6" fill="currentColor" />
      </svg>
    )
  }
  if (value === 'interpretation') {
    return (
      <svg {...p}>
        <circle cx="6" cy="6" r="4.3" stroke="currentColor" strokeWidth="1" strokeOpacity="0.8" />
        <path d="M6 1.7a4.3 4.3 0 0 1 0 8.6z" fill="currentColor" />
      </svg>
    )
  }
  if (value === 'hypothesis') {
    return (
      <svg {...p}>
        <circle cx="6" cy="6" r="4.3" stroke="currentColor" strokeWidth="1" strokeDasharray="1.7 1.9" />
      </svg>
    )
  }
  return (
    <svg {...p}>
      <path d="M6 1.5 10.5 6 6 10.5 1.5 6z" fill="currentColor" />
    </svg>
  )
}

/** 事件节点。形状 = 类型；实心 = 这次产出了证据。 */
export function EventNode({ kind, filled, size = 14, className }: SvgProps & { kind: DevEvent['kind']; filled?: boolean }) {
  const p = { ...base(size), className: cn('shrink-0', className) }
  const fill = filled ? 'currentColor' : 'none'
  switch (kind) {
    case 'learning':
      return (
        <svg {...p}>
          <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" fill={fill} />
        </svg>
      )
    case 'research':
      return (
        <svg {...p}>
          <rect x="3.6" y="3.6" width="4.8" height="4.8" stroke="currentColor" strokeWidth="1.3" fill={fill} />
        </svg>
      )
    case 'creation':
      return (
        <svg {...p}>
          <path d="M6 3 9.3 8.4H2.7z" stroke="currentColor" strokeWidth="1.3" fill={fill} strokeLinejoin="round" />
        </svg>
      )
    case 'reflection':
      return (
        <svg {...p}>
          <path d="M6 2.4 9.6 6 6 9.6 2.4 6z" stroke="currentColor" strokeWidth="1.3" fill={fill} />
        </svg>
      )
    case 'direction':
      return (
        <svg {...p}>
          <path d="M3.4 2.8 8.8 6l-5.4 3.2z" stroke="currentColor" strokeWidth="1.3" fill={fill} strokeLinejoin="round" />
        </svg>
      )
    default:
      return (
        <svg {...p}>
          <path d="M6 1.9 10.1 6 6 10.1 1.9 6z" fill="currentColor" />
        </svg>
      )
  }
}

/** 首页三种发现的标记：两处相连 / 同心的弧 / 虚线圆上伸出去的一笔。 */
export function DiscoveryMark({ kind, size = 28, className }: SvgProps & { kind: Discovery['kind'] }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 22 22',
    fill: 'none' as const,
    'aria-hidden': true,
    className: cn('shrink-0', className),
  }
  if (kind === 'connection') {
    return (
      <svg {...common}>
        <path d="M7.4 11h7.2" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.55" />
        <circle cx="5.4" cy="11" r="2.6" stroke="currentColor" strokeWidth="1.1" />
        <circle cx="16.6" cy="11" r="2.6" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    )
  }
  if (kind === 'pattern') {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7.4" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.4" />
        <circle cx="11" cy="11" r="4.4" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.7" />
        <circle cx="11" cy="11" r="1.6" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="10" cy="12" r="5.6" stroke="currentColor" strokeWidth="1.1" strokeDasharray="1.9 2.1" />
      <path d="M13.6 8.4 18 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M14.6 3.4h3.6v3.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 证据分布：横线上方是支撑，下方是反驳，右侧是削弱/限定。 */
export function EvidenceStrip({
  supports,
  contradicts,
  weakens,
  qualifies,
  className,
}: {
  supports: number
  contradicts: number
  weakens: number
  qualifies: number
  className?: string
}) {
  const total = supports + contradicts + weakens + qualifies
  const W = 64
  const GAP = 1
  // 定宽比例条：不管几条证据，长度一样，所以行与行之间可以直接比。
  // 段与段留 1px 缝，反驳永远贴最右 —— 不这样的话它会跟着顺序跑，读起来像进度条。
  const segs =
    total === 0
      ? []
      : [
          { n: supports, fill: 'currentColor', o: 0.75 },
          { n: weakens + qualifies, fill: 'currentColor', o: 0.22 },
          // 反驳是信号色：amber，亮暗各取一档。其余段跟随 currentColor。
          { n: contradicts, fill: 'currentColor', o: 1, signal: true },
        ].filter((s) => s.n > 0)
  let cursor = 0
  return (
    <svg width={W} height={10} viewBox={`0 0 ${W} 10`} aria-hidden className={cn('shrink-0', className)}>
      <rect x="0" y="3" width={W} height="4" fill="currentColor" fillOpacity="0.1" />
      {segs.map((s, i) => {
        const w = Math.max(1.5, (s.n / total) * W - GAP)
        const x = cursor
        cursor += w + GAP
        return (
          <rect
            key={i}
            x={x}
            y="3"
            width={w}
            height="4"
            fill="currentColor"
            fillOpacity={s.signal ? 1 : s.o}
            className={s.signal ? 'text-amber-600 dark:text-amber-400' : undefined}
          />
        )
      })}
    </svg>
  )
}

/* ── 界面用的小图标 ───────────────────────────────────────────── */

const icon = (size: number, className?: string) => ({ ...base(size), className: cn('shrink-0', className) })

export function IconArrow({ size = 12, className }: SvgProps) {
  return (
    <svg {...icon(size, className)}>
      <path d="M2.4 6h7M6.8 3.2 9.6 6l-2.8 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconBack({ size = 13, className }: SvgProps) {
  return (
    <svg {...icon(size, className)}>
      <path d="M9.6 6h-7M5.2 2.8 2 6l3.2 3.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconClose({ size = 11, className }: SvgProps) {
  return (
    <svg {...icon(size, className)}>
      <path d="m3 3 6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function IconChevron({ open, size = 9, className }: SvgProps & { open?: boolean }) {
  return (
    <svg {...icon(size, className)} style={{ transform: open ? 'rotate(90deg)' : 'none' }}>
      <path d="M4 1.8 8.2 6 4 10.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconPlus({ size = 10, className }: SvgProps) {
  return (
    <svg {...icon(size, className)}>
      <path d="M6 2.2v7.6M2.2 6h7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function IconMinus({ size = 10, className }: SvgProps) {
  return (
    <svg {...icon(size, className)}>
      <path d="M2.2 6h7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function IconSearch({ size = 12, className }: SvgProps) {
  return (
    <svg {...icon(size, className)}>
      <circle cx="5.3" cy="5.3" r="3.4" stroke="currentColor" strokeWidth="1.2" />
      <path d="m7.9 7.9 2.4 2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

/** 一处连接：两个节点 + 一条边。用在连接块的开头。 */
export function IconLink({ size = 14, dashed, className }: SvgProps & { dashed?: boolean }) {
  return (
    <svg {...icon(size, className)}>
      <path
        d="M3.4 6h5.2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeDasharray={dashed ? '1.5 1.6' : undefined}
      />
      <circle cx="2.4" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="9.6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  )
}

/** 一处小标题前的装饰：一条短横线加一个点。用于分节，代替纯文字标签。 */
export function SectionRule({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-current', className)} aria-hidden>
      <span className="h-[5px] w-[5px] rotate-45 bg-current opacity-70" />
      <span className="h-px w-4 bg-current opacity-25" />
    </span>
  )
}

export function GlyphWrap({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center">{children}</span>
}
