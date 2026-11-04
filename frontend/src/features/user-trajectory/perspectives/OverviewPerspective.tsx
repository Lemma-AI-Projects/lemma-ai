import { DISCOVERIES, OBJECTS, focusShort, refOf } from '../data'
import { PAGE } from '../kit'
import { EpistemicMark, Label, RefLink, Rule, TextAction } from '../parts'
import type { Store } from '../store'
import type { Discovery } from '../types'

/** 日期 → 0..100 的横向位置。只用于那条极简的地形。 */
function pct(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const months = (y - 2026) * 12 + (m - 1)
  return Math.min(100, ((months + (d - 1) / 30) / 10) * 100)
}

const KIND_WORD: Record<Discovery['kind'], string> = {
  connection: '一处连接',
  pattern: '一个模式',
  possibility: '一种可能',
}

/**
 * 概览 = 发现面。
 *
 * 这一轮砍掉的三块：发展地形从首屏降到页尾（它是背景，不是发现）；
 * 「最近发生」整块删掉（那是时间轴的活，抄一遍只会让首页变成仪表盘）；
 * 页脚那段解释删掉（它是在跟评审说话，不是跟用户）。
 *
 * 剩下：两条发现 → 第三条收成一行 → 一张地形。没有卡片，没有统计，没有进度。
 */
export function OverviewPerspective({ s }: { s: Store }) {
  const [lead, second, third] = DISCOVERIES
  const focuses = OBJECTS.filter((o) => o.kind === 'focus')

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={PAGE}>
        <div className="flex items-baseline justify-between">
          <Label>发现</Label>
          <span className="text-[10px] tabular-nums text-muted-foreground/60">2026.01 — 11</span>
        </div>

        <div className="mt-3">
          <DiscoveryBlock s={s} d={lead} />
          <Rule className="my-6" />
          <DiscoveryBlock s={s} d={second} />
          {third ? (
            <>
              <Rule className="my-5" />
              <button
                type="button"
                onClick={() => s.openDiscovery(third)}
                className="group flex w-full items-baseline gap-2.5 py-0.5 text-left"
              >
                <span className="shrink-0 text-[10px] text-muted-foreground/70">{KIND_WORD[third.kind]}</span>
                <EpistemicMark value={third.epistemic} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground group-hover:text-foreground">
                  {third.title}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground/50 group-hover:text-foreground">→</span>
              </button>
            </>
          ) : null}
        </div>

        <div className="mt-14">
          <div className="flex items-baseline justify-between">
            <Label>这一年</Label>
            <span className="text-[10px] text-muted-foreground/60">线的长度是时间，不是投入</span>
          </div>
          <div className="mt-2.5">
            {focuses.map((f) => {
              const left = f.from ? pct(f.from) : 0
              const right = f.to ? pct(f.to) : 100
              const active = s.focusFilter === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    s.setFocusFilter(active ? null : f.id)
                    s.switchPerspective('timeline')
                  }}
                  className="group grid w-full grid-cols-[96px_1fr] items-center gap-3 py-[3px] text-left"
                >
                  <span
                    className={`truncate text-[11px] ${active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}
                  >
                    {focusShort(f.id, f.title)}
                  </span>
                  <span className="relative h-[11px]">
                    <span className="absolute inset-x-0 top-1/2 h-px bg-border/60" />
                    <span
                      className={`absolute top-1/2 h-[2px] -translate-y-1/2 ${
                        active ? 'bg-foreground' : 'bg-foreground/30 group-hover:bg-foreground/60'
                      }`}
                      style={{ left: `${left}%`, width: `${Math.max(1.2, right - left)}%` }}
                    />
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-14 flex items-baseline justify-between">
          <span className="text-[11px] text-muted-foreground/70">不评分，也不计连续天数。</span>
          <TextAction muted onClick={() => s.switchPerspective('timeline')}>
            自己走 →
          </TextAction>
        </div>
      </div>
    </div>
  )
}

function DiscoveryBlock({ s, d }: { s: Store; d: Discovery }) {
  // 只把「对象」摊开写成名字。证据和解释的 label 是一整句话，做成 chip 只会变成一串省略号。
  const objRefs = d.refIds.filter((id) => refOf(id)?.type === 'object')
  const rest = d.refIds.length - objRefs.length

  return (
    <article>
      <div className="flex items-baseline gap-2.5">
        <span className="text-[10px] text-muted-foreground/80">{KIND_WORD[d.kind]}</span>
        <EpistemicMark value={d.epistemic} />
      </div>
      <h2 className="mt-2 font-serif text-[20px] leading-[1.5] tracking-[-0.01em] text-foreground">{d.title}</h2>
      <p className="mt-2.5 max-w-[42em] text-[12px] leading-[1.8] text-muted-foreground">{d.why}</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {objRefs.map((id, i) => (
          <span key={id} className="flex items-baseline gap-3">
            {i > 0 ? <span className="text-[10px] text-muted-foreground/30">·</span> : null}
            <RefLink s={s} id={id} className="text-[11px] text-muted-foreground" />
          </span>
        ))}
        {rest > 0 ? (
          <span className="text-[10px] tabular-nums text-muted-foreground/60">
            {objRefs.length > 0 ? `+${rest} 条记录` : `依据 ${rest} 条记录`}
          </span>
        ) : null}
        <TextAction className="ml-auto" onClick={() => s.openDiscovery(d)}>
          走下去 →
        </TextAction>
      </div>
    </article>
  )
}
