import { useState } from 'react'

import { CANDIDATE_STATE_LABEL, EVIDENCE_BY_ID, refOf } from '../data'
import { Chip, Empty, EpistemicMark, Section, SelectRow } from '../parts'
import type { Store } from '../store'

type Filter = 'all' | 'unreviewed' | 'confirmed' | 'rejected' | 'candidates'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'unreviewed', label: '你没看过' },
  { key: 'confirmed', label: '你认可过' },
  { key: 'rejected', label: '你否掉的' },
  { key: 'candidates', label: '候选' },
]

export function InsightsPerspective({ s }: { s: Store }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const all = s.insights
  const rows = all.filter((i) => {
    if (filter === 'unreviewed') return i.status === 'unreviewed'
    if (filter === 'confirmed') return i.epistemic === 'confirmed' || i.status === 'confirmed'
    if (filter === 'rejected') return i.status === 'rejected'
    return true
  })

  const pending = all.filter((i) => i.status === 'unreviewed').length
  const countOf = (f: Filter) => {
    if (f === 'candidates') return s.candidates.length
    if (f === 'all') return all.length
    if (f === 'unreviewed') return pending
    if (f === 'confirmed') return all.filter((i) => i.epistemic === 'confirmed' || i.status === 'confirmed').length
    return all.filter((i) => i.status === 'rejected').length
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-[188px] shrink-0 border-r border-border px-3 py-4">
        <div className="mb-2 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">看法</div>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`flex w-full items-baseline justify-between border-l-2 py-1 pl-2 text-left text-[12px] ${
              filter === f.key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{f.label}</span>
            <span className="text-[10px] tabular-nums text-muted-foreground/70">
              {countOf(f.key)}
            </span>
          </button>
        ))}
        <p className="mt-4 border-t border-border pt-3 text-[10px] leading-4 text-muted-foreground">
          解释不是结论。<b className="font-medium text-foreground/80">◐</b> 是系统推断，
          <b className="font-medium text-foreground/80">○</b> 是还没验证的假设，
          <b className="font-medium text-foreground/80">◆</b> 是他自己的话。
        </p>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
        {filter !== 'candidates' ? (
          <Section label="解释" hint={`${pending} 条你还没看过`}>
            {rows.length === 0 ? <Empty>这一类里没有东西。</Empty> : null}
            <div className="divide-y divide-border/60">
              {rows.map((i) => (
                <SelectRow
                  key={i.id}
                  selected={s.selected?.id === i.id}
                  onClick={() => s.select(i.id)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    s.openMenu(e, i.id, 'insight')
                  }}
                >
                  <div className="flex items-baseline gap-2">
                    <EpistemicMark value={i.epistemic} />
                    <span className="w-9 shrink-0 text-[10px] tabular-nums text-muted-foreground">{i.date.slice(5)}</span>
                    <span className={`min-w-0 flex-1 text-[12px] leading-5 ${i.status === 'rejected' ? 'text-muted-foreground line-through' : 'text-foreground/90'}`}>
                      <span className="line-clamp-2">{i.statement}</span>
                    </span>
                    {i.status === 'rejected' ? <Chip className="shrink-0">你否掉的</Chip> : null}
                    {i.status === 'corrected' ? <Chip className="shrink-0">你改过</Chip> : null}
                  </div>
                  <div className="mt-0.5 flex gap-3 pl-[52px] text-[10px] text-muted-foreground">
                    {i.supports.length > 0 ? <span>支撑 {i.supports.length}</span> : null}
                    {i.weakens.length > 0 ? <span>削弱 {i.weakens.length}</span> : null}
                    {i.contradicts.length > 0 ? <span className="text-foreground/70">反驳 {i.contradicts.length}</span> : null}
                    {i.qualifies.length > 0 ? <span>限定 {i.qualifies.length}</span> : null}
                    {i.supports.length + i.weakens.length + i.contradicts.length + i.qualifies.length === 0 ? (
                      <span>没有任何证据</span>
                    ) : null}
                  </div>
                </SelectRow>
              ))}
            </div>
          </Section>
        ) : null}

        <Section
          label="候选"
          hint="系统在后台攒的东西，不是待办"
          className={filter === 'candidates' ? '' : 'mt-6'}
        >
          <div className="space-y-4">
            {s.candidates.map((c) => (
              <article key={c.id} className="border-l border-border pl-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] tracking-wide text-muted-foreground">{CANDIDATE_STATE_LABEL[c.state]}</span>
                  <span className="text-[10px] text-muted-foreground/60">始于 {c.firstSeen.slice(5)}</span>
                </div>
                <p className="mt-0.5 text-[12px] leading-5 text-foreground/90">{c.statement}</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{c.signalNote}</p>

                <div className="mt-1 flex flex-wrap gap-1">
                  {c.signalIds.map((sid) => {
                    const ev = EVIDENCE_BY_ID.get(sid)
                    const ref = refOf(sid)
                    if (!ref) return null
                    return (
                      <Chip key={sid} onClick={() => s.select(sid)} title={ev ? `证据 · ${ev.observed}` : ref.label}>
                        {ev ? '证据 ' + ev.date.slice(5) : ref.label.length > 14 ? ref.label.slice(0, 13) + '…' : ref.label}
                      </Chip>
                    )
                  })}
                </div>

                {c.state === 'accumulating' ? (
                  <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{c.why}</p>
                ) : null}

                {c.state === 'emerging' ? (
                  <div className="mt-2">
                    <p className="text-[11px] leading-4 text-muted-foreground">{c.why}</p>
                    {editing === c.id ? (
                      <div className="mt-2">
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={2}
                          className="w-full border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-foreground/40"
                          placeholder="按你的说法改写它"
                        />
                        <div className="mt-1 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              s.resolveCandidate(c.id, 'corrected')
                              setEditing(null)
                            }}
                            className="border border-foreground/30 px-2 py-0.5 text-[11px] hover:bg-muted"
                          >
                            用我的说法
                          </button>
                          <button type="button" onClick={() => setEditing(null)} className="text-[11px] text-muted-foreground hover:text-foreground">
                            算了
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
                        <button type="button" onClick={() => s.resolveCandidate(c.id, 'confirmed')} className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground">
                          说得对
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(c.id)
                            setDraft(c.statement)
                          }}
                          className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
                        >
                          改说法
                        </button>
                        <button type="button" onClick={() => s.resolveCandidate(c.id, 'ignored')} className="text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground">
                          不是我
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}

                {c.state === 'resolved' && c.resolution ? (
                  <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                    {c.resolution.at.slice(5)} · {c.resolution.note}。{c.why}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          <p className="mt-4 border-t border-border pt-3 text-[10px] leading-4 text-muted-foreground">
            沉默不算确认。攒着的东西不会因为没人管就变成兴趣或能力；到期就关掉，不等你点头。
          </p>
        </Section>
      </div>
    </div>
  )
}
