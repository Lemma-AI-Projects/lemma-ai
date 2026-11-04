import { DISCOVERIES, EVENTS, OBJECTS, md, refOf } from '../data'
import { Chip, EpistemicMark, Section, SelectRow } from '../parts'
import type { Store } from '../store'
import type { Discovery } from '../types'

const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']

/** 日期 → 0..100 的横向位置。只用于首页那条极简的「发展地形」。 */
function pct(date: string) {
  const m = MONTHS.indexOf(date.slice(0, 7))
  const d = Number(date.slice(8, 10))
  const idx = m < 0 ? 0 : m
  return Math.min(100, ((idx + (d - 1) / 30) / (MONTHS.length - 1)) * 100)
}

const KIND_WORD: Record<Discovery['kind'], string> = {
  connection: '一处连接',
  pattern: '一个模式',
  possibility: '一种可能',
}

export function OverviewPerspective({ s }: { s: Store }) {
  const focuses = OBJECTS.filter((o) => o.kind === 'focus')
  // 每天最多取一条：同一天里四条 repr-view 的记录，铺出来只是重复，不是「最近发生」
  const recent = [...new Set([...EVENTS].sort((a, b) => b.date.localeCompare(a.date)).map((e) => e.date))]
    .slice(0, 5)
    .map((d) => EVENTS.find((e) => e.date === d)!)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[880px] px-6 py-6">
      <Section label="发展地形" hint="七条线索，横轴是这一年">
        <div className="space-y-1">
          {focuses.map((f) => {
            const left = f.from ? pct(f.from) : 0
            const right = f.to ? pct(f.to) : 100
            const active = s.selected?.id === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  s.select(f.id)
                  s.switchPerspective('timeline')
                }}
                className="group grid w-full grid-cols-[136px_1fr] items-center gap-2 py-1 text-left"
              >
                <span className={`truncate text-[11px] ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{f.title}</span>
                <span className="relative h-3 border-l border-border/70">
                  <span
                    className={`absolute top-1/2 h-[3px] -translate-y-1/2 ${active ? 'bg-foreground' : 'bg-foreground/25 group-hover:bg-foreground/50'}`}
                    style={{ left: `${left}%`, width: `${Math.max(1.5, right - left)}%` }}
                  />
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
          线的长短是时间，不是投入。{MONTHS[0].replace('-', '/')} — {MONTHS[MONTHS.length - 1].replace('-', '/')}
        </p>
      </Section>

      <Section label="值得看一眼" hint="三条，不是信息流" className="mt-6">
        <div className="space-y-5">
          {DISCOVERIES.map((d) => (
            <article key={d.id} className="border-l border-border pl-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] tracking-wide text-muted-foreground">{KIND_WORD[d.kind]}</span>
                <EpistemicMark value={d.epistemic} />
              </div>
              <h3 className="mt-1 font-serif text-[16px] leading-6 text-foreground">{d.title}</h3>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{d.why}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                {d.refIds.map((id) => {
                  const r = refOf(id)
                  if (!r) return null
                  return (
                    <Chip key={id} onClick={() => s.select(id)} title={r.label}>
                      {r.label.length > 16 ? r.label.slice(0, 15) + '…' : r.label}
                    </Chip>
                  )
                })}
                <button
                  type="button"
                  onClick={() => s.openDiscovery(d)}
                  className="ml-1 text-[11px] text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
                >
                  打开 →
                </button>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section
        label="最近发生"
        hint="只给五条，完整的在时间轴"
        className="mt-6"
        right={
          <button
            type="button"
            onClick={() => s.switchPerspective('timeline')}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            进时间轴 →
          </button>
        }
      >
        <div className="divide-y divide-border/60">
          {recent.map((e) => (
            <SelectRow key={e.id} selected={s.selected?.id === e.id} onClick={() => s.select(e.id)}>
              <div className="flex items-baseline gap-3">
                <span className="w-10 shrink-0 text-[11px] tabular-nums text-muted-foreground">{md(e.date)}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/90">{e.title}</span>
                {e.evidenceIds.length > 0 ? (
                  <span className="shrink-0 text-[10px] text-muted-foreground">依据 {e.evidenceIds.length}</span>
                ) : null}
              </div>
            </SelectRow>
          ))}
        </div>
      </Section>

      <p className="mt-8 border-t border-border pt-3 text-[11px] leading-5 text-muted-foreground">
        这一页没有完成率、没有连续天数、没有分数。它不是用来核对你做了多少的 ——
        上面三块是「你可能没注意到的东西」；找不到就说找不到。
      </p>
      </div>
    </div>
  )
}
