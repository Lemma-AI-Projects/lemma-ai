import { DISCOVERIES, OBJECTS, focusShort, refOf } from '../data'
import { PAGE } from '../kit'
import { DiscoveryMark, IconArrow } from '../marks'
import { EpistemicMark, Label, RefLink, TextAction } from '../parts'
import type { Store } from '../store'
import type { DevObject, Discovery } from '../types'

const MONTHS = 10 // 2026-01 … 2026-11，跨度按 10 个月算
const PLOT_X = 116
const PLOT_W = 648 - PLOT_X - 6
const ROW_H = 23
const BAR_H = 4

/** 日期 → 0..1 的横向位置。 */
function frac(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const months = (y - 2026) * 12 + (m - 1)
  return Math.max(0, Math.min(1, (months + (d - 1) / 30) / MONTHS))
}

const KIND_WORD: Record<Discovery['kind'], string> = {
  connection: '一处连接',
  pattern: '一个模式',
  possibility: '一种可能',
}

/**
 * 概览 = 发现面。
 *
 * 这一版把「发展地形」从 7 条 2px 的 div 换成一张真的图：有基线斜率、月刻度、闭线/并线/在线的三种样式。
 * 文字仍然承担主要工作，但页面左边缘多了一条窄栏（编号 + 小标题）——
 * 它给整页一个稳定的竖直骨架，比再加一层边框更有用。
 */
export function OverviewPerspective({ s }: { s: Store }) {
  const [lead, second, third] = DISCOVERIES
  const focuses = OBJECTS.filter((o) => o.kind === 'focus')

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={PAGE}>
        <div className="flex items-baseline justify-between">
          <Label plain>发现</Label>
          <span className="text-[9.5px] tracking-[0.16em] text-zinc-400 dark:text-zinc-500">2026.01 — 11</span>
        </div>

        <div className="mt-8 space-y-12">
          <DiscoveryBlock s={s} d={lead} index="01" lead />
          <DiscoveryBlock s={s} d={second} index="02" />
        </div>

        {third ? (
          <button
            type="button"
            onClick={() => s.openDiscovery(third)}
            className="group mt-9 grid w-full grid-cols-[30px_1fr] gap-x-6 border-t border-zinc-200 dark:border-zinc-800 pt-6 text-left"
          >
            <div className="pt-px text-[10px] tabular-nums text-zinc-400/70 dark:text-zinc-500/70">03</div>
            <div className="flex items-start gap-3">
              <DiscoveryMark kind={third.kind} size={20} className="mt-[1px] text-zinc-900/40 dark:text-zinc-100/40" />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[9.5px] tracking-[0.16em] text-zinc-400 dark:text-zinc-500">{KIND_WORD[third.kind]}</span>
                  <EpistemicMark value={third.epistemic} compact />
                </div>
                <p className="mt-1.5 text-[12.5px] leading-[1.7] text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-zinc-950 dark:group-hover:text-zinc-50">
                  {third.title}
                  <span className="ml-1.5 inline-flex translate-y-[1px] text-zinc-400 dark:text-zinc-500 transition-colors group-hover:text-zinc-950 dark:group-hover:text-zinc-50">
                    <IconArrow size={11} />
                  </span>
                </p>
              </div>
            </div>
          </button>
        ) : null}

        <div className="mt-16">
          <div className="flex items-baseline justify-between">
            <Label>这一年，七条线索</Label>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">线的长度是时间，不是投入</span>
          </div>
          <Territory s={s} focuses={focuses} />
        </div>

        <div className="mt-14 flex items-baseline justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">不评分，也不计连续天数。</span>
          <TextAction muted onClick={() => s.switchPerspective('timeline')}>
            自己走
            <IconArrow />
          </TextAction>
        </div>
      </div>
    </div>
  )
}

function DiscoveryBlock({ s, d, index, lead }: { s: Store; d: Discovery; index: string; lead?: boolean }) {
  // 只把「对象」摊开写成名字。证据和解释的 label 是一整句话，做成 chip 只会变成一串省略号。
  const objRefs = d.refIds.filter((id) => refOf(id)?.type === 'object')
  const rest = d.refIds.length - objRefs.length

  return (
    <article className="grid grid-cols-[30px_1fr] gap-x-6">
      <div className="flex flex-col items-start gap-2">
        <span className="text-[10px] tabular-nums text-zinc-400/70 dark:text-zinc-500/70">{index}</span>
        <span className="h-full w-px bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div>
        <div className="flex items-center gap-3">
          <DiscoveryMark kind={d.kind} className={d.kind === 'connection' ? 'text-zinc-900/60 dark:text-zinc-100/60' : 'text-zinc-900/45 dark:text-zinc-100/45'} />
          <span className="text-[9.5px] tracking-[0.16em] text-zinc-400 dark:text-zinc-500">{KIND_WORD[d.kind]}</span>
          <EpistemicMark value={d.epistemic} />
        </div>
        <h2
          className={
            lead
              ? 'mt-3 font-serif text-[27px] leading-[1.42] tracking-[-0.012em] text-zinc-950 dark:text-zinc-50'
              : 'mt-3 font-serif text-[21px] leading-[1.5] tracking-[-0.008em] text-zinc-950 dark:text-zinc-50'
          }
        >
          {d.title}
        </h2>
        <p className="mt-4 max-w-[38em] text-[13px] leading-[1.95] text-zinc-500 dark:text-zinc-400">{d.why}</p>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {objRefs.map((id, i) => (
            <span key={id} className="flex items-baseline gap-3">
              {i > 0 ? <span className="text-[10px] text-zinc-400 dark:text-zinc-500/50">·</span> : null}
              <RefLink s={s} id={id} className="text-[11px] text-zinc-500 dark:text-zinc-400" />
            </span>
          ))}
          {rest > 0 ? (
            <span className="text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
              {objRefs.length > 0 ? `+${rest} 条记录` : `依据 ${rest} 条记录`}
            </span>
          ) : null}
          <TextAction className="ml-auto" onClick={() => s.openDiscovery(d)}>
            走下去
            <IconArrow />
          </TextAction>
        </div>
      </div>
    </article>
  )
}

/**
 * 发展地形。
 *
 * 一个 SVG，不是七条 div：这样才能同时有月刻度、行基线，以及三种线条样式
 * （在线 = 深灰实线；关门 = 灰实线加竖档；并线 = 灰虚线）。标签用 `<text>` 画在同一坐标系里，
 * 所以永远不会和柱子错行。颜色用 currentColor + `text-*` 类，暗色不用另画一份。
 */
function Territory({ s, focuses }: { s: Store; focuses: DevObject[] }) {
  const H = focuses.length * ROW_H + 26
  const TICKS = [1, 4, 7, 10]

  return (
    <svg
      viewBox={`0 0 648 ${H}`}
      width="100%"
      height={H}
      className="mt-4 overflow-visible"
      role="img"
      aria-label="七条线索的时间分布"
    >
      {/* 标签列与图之间的分界 */}
      <line
        x1={PLOT_X - 12}
        y1={0}
        x2={PLOT_X - 12}
        y2={focuses.length * ROW_H - 2}
        className="text-zinc-200 dark:text-zinc-800"
        stroke="currentColor"
        strokeWidth="1"
      />

      {/* 竖向月刻度 */}
      {TICKS.map((m) => {
        const x = PLOT_X + ((m - 1) / MONTHS) * PLOT_W
        return (
          <g key={m}>
            <line
              x1={x}
              y1={0}
              x2={x}
              y2={focuses.length * ROW_H - 2}
              className="text-zinc-200 dark:text-zinc-800"
              stroke="currentColor"
              strokeWidth="1"
              strokeOpacity="0.7"
            />
            <text x={x} y={H - 6} textAnchor="middle" fontSize="9" className="text-zinc-400 dark:text-zinc-500" fill="currentColor">
              {m} 月
            </text>
          </g>
        )
      })}

      {focuses.map((f, i) => {
        const y = i * ROW_H + 7
        const a = f.from ? frac(f.from) : 0
        const b = f.to ? frac(f.to) : 1
        const x1 = PLOT_X + a * PLOT_W
        const x2 = Math.max(x1 + 5, PLOT_X + b * PLOT_W)
        const active = s.focusFilter === f.id
        const open = !f.to
        const absorbed = f.status === 'absorbed'
        // 在线（没关门的）画深一点，关门与并线浅一档 —— 不用彩色，靠深浅与线型区分。
        const ink = active ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'
        return (
          <g
            key={f.id}
            className="cursor-pointer"
            onClick={() => {
              s.setFocusFilter(active ? null : f.id)
              s.switchPerspective('timeline')
            }}
          >
            <rect x={0} y={y - 7} width={648} height={ROW_H - 1} className="fill-transparent hover:fill-zinc-900/[0.04] dark:hover:fill-zinc-100/[0.04]" />
            <text
              x={0}
              y={y + BAR_H}
              fontSize="10.5"
              className={active ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'}
              fill="currentColor"
            >
              {focusShort(f.id, f.title)}
            </text>
            <line
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              className={ink}
              stroke="currentColor"
              strokeWidth={active ? 4.5 : 3.5}
              strokeLinecap="round"
              strokeDasharray={absorbed ? '2 4' : undefined}
              opacity={active ? 1 : 0.9}
            />
            {open ? <circle cx={x2} cy={y} r={2.6} className={ink} fill="currentColor" opacity={active ? 1 : 0.9} /> : null}
            {f.status === 'closed' ? (
              <line
                x1={x2}
                y1={y - 4}
                x2={x2}
                y2={y + 4}
                className={ink}
                stroke="currentColor"
                strokeWidth="1.4"
                opacity={active ? 1 : 0.75}
              />
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
