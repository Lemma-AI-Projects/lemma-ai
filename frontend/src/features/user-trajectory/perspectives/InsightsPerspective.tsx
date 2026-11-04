import { useState } from 'react'

import { CANDIDATE_STATE_LABEL } from '../data'
import { EpistemicMark, Label, Quiet, Row } from '../parts'
import type { Store } from '../store'

type Filter = 'all' | 'unreviewed' | 'candidates'

/**
 * 理解 = 浮现出来的模式。
 *
 * 这一轮砍掉：左侧五个筛选（改成三个，其余靠列表本身区分）、
 * 默认展开的候选卡片（候选不是待办，不该在列表里就能审批）、
 * 顶部那块字数很多的四态说明（四态记号现在只出现在它真正影响判断的地方）。
 *
 * 候选和解释排在同一条流里，但它们长得不一样：解释给四态，候选给状态。
 * 点一条候选才看得到它的信号和三个动作 —— 没点开的时候它不要求你做任何事。
 */
export function InsightsPerspective({ s }: { s: Store }) {
  const [filter, setFilter] = useState<Filter>('all')

  const all = s.insights
  const unreviewed = all.filter((i) => i.status === 'unreviewed')
  const rows = filter === 'unreviewed' ? unreviewed : all
  const showCandidates = filter !== 'unreviewed'
  const pending = unreviewed.length

  const tabs: { key: Filter; label: string; n: number }[] = [
    { key: 'all', label: '全部', n: all.length },
    { key: 'unreviewed', label: '你没看过', n: pending },
    { key: 'candidates', label: '候选', n: s.candidates.length },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 pt-4">
        <div className="mx-auto flex max-w-[720px] items-baseline gap-5 border-b border-border px-8 pb-2 pl-[42px]">
          {tabs.map((t) => {
            const active = filter === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={
                  active
                    ? 'flex items-baseline gap-1.5 text-[11px] text-foreground'
                    : 'flex items-baseline gap-1.5 text-[11px] text-muted-foreground hover:text-foreground'
                }
              >
                <span className={active ? 'underline decoration-foreground underline-offset-[5px]' : ''}>{t.label}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground/60">{t.n}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-8 pt-2 pb-24">
          {rows.length === 0 ? <Quiet className="py-8">这一类里没有东西。</Quiet> : null}
          {rows.map((i, idx) => {
            const rejected = i.status === 'rejected'
            const tally = [
              i.contradicts.length > 0 ? { k: '反驳', n: i.contradicts.length, strong: true } : null,
              i.supports.length > 0 ? { k: '支撑', n: i.supports.length, strong: false } : null,
              i.weakens.length > 0 ? { k: '削弱', n: i.weakens.length, strong: false } : null,
              i.qualifies.length > 0 ? { k: '限定', n: i.qualifies.length, strong: false } : null,
            ].filter((x): x is { k: string; n: number; strong: boolean } => Boolean(x))
            return (
              <div key={i.id} className={idx > 0 ? 'border-t border-border/60' : ''}>
              <Row
                selected={s.selected?.id === i.id}
                onClick={() => s.select(i.id)}
                className="py-2.5"
              >
                <div className="flex items-start gap-3">
                  <EpistemicMark value={i.epistemic} className="w-[62px] shrink-0 pt-[3px]" />
                  <span className={`min-w-0 flex-1 text-[12px] leading-[1.65] ${rejected ? 'text-muted-foreground' : 'text-foreground/90'}`}>
                    <span className="line-clamp-2">{i.statement}</span>
                  </span>
                  <span className="shrink-0 pt-[2px] text-[10px] tabular-nums text-muted-foreground/60">{i.date.slice(5)}</span>
                </div>
                <div className="mt-1 flex items-baseline gap-3 pl-[74px] text-[10px]">
                  {tally.length === 0 ? (
                    <span className="text-muted-foreground/60">没有证据</span>
                  ) : (
                    tally.map((t) => (
                      <span key={t.k} className={t.strong ? 'text-foreground/80' : 'text-muted-foreground'}>
                        {t.k} {t.n}
                      </span>
                    ))
                  )}
                  {i.status === 'corrected' ? <span className="text-muted-foreground/70">你改过</span> : null}
                  {rejected ? <span className="text-muted-foreground/70">你否掉的</span> : null}
                </div>
              </Row>
              </div>
            )
          })}

          {showCandidates ? (
            <div className="mt-10">
              <div className="flex items-baseline justify-between">
                <Label>候选</Label>
                <span className="text-[10px] text-muted-foreground/60">系统在攒的，不是待办</span>
              </div>
              <div className="mt-1">
                {s.candidates.map((c, idx) => {
                  const resolved = c.state === 'resolved'
                  return (
                    <div key={c.id} className={idx > 0 ? 'border-t border-border/60' : ''}>
                    <Row
                      selected={s.selected?.id === c.id}
                      onClick={() => s.select(c.id, 'candidate')}
                      className="py-2.5"
                      dim={resolved}
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-[62px] shrink-0 pt-[3px] text-[10px] text-muted-foreground">
                          {CANDIDATE_STATE_LABEL[c.state]}
                        </span>
                        <span className={`min-w-0 flex-1 text-[12px] leading-[1.65] ${resolved ? 'text-muted-foreground' : 'text-foreground/90'}`}>
                          <span className="line-clamp-2">{c.statement}</span>
                        </span>
                        <span className="shrink-0 pt-[2px] text-[10px] tabular-nums text-muted-foreground/60">{c.firstSeen.slice(5)}</span>
                      </div>
                      <div className="mt-1 pl-[74px] text-[10px] text-muted-foreground/70">
                        {resolved && c.resolution ? c.resolution.note : `${c.signalIds.length} 条记录`}
                      </div>
                    </Row>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
