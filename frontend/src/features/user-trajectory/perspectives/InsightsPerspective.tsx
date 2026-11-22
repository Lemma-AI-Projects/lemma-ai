import { useState } from 'react'

import { CANDIDATE_STATE_LABEL } from '../data'
import { EvidenceStrip, EpiMark } from '../marks'
import { Label, Quiet, Row } from '../parts'
import type { Store } from '../store'

type Filter = 'all' | 'unreviewed' | 'candidates'

/**
 * 理解 = 浮现出来的模式。
 *
 * 每行左边只有一个 12px 的记号（四态），右边一行小字把「谁说的 + 证据分布」放在一起。
 * 证据分布是一条定宽比例条：实心=支撑，amber=反驳，浅=削弱。定宽才能跨行比较。
 * 候选和解释排在同一条流里，但候选的左边换成一个小方块，动作只在右栏。
 */
export function InsightsPerspective({ s }: { s: Store }) {
  const [filter, setFilter] = useState<Filter>('all')

  const all = s.insights
  const unreviewed = all.filter((i) => i.status === 'unreviewed')
  const rows = filter === 'unreviewed' ? unreviewed : all
  const showCandidates = filter !== 'unreviewed'

  const tabs: { key: Filter; label: string; n: number }[] = [
    { key: 'all', label: '全部', n: all.length },
    { key: 'unreviewed', label: '你没看过', n: unreviewed.length },
    { key: 'candidates', label: '候选', n: s.candidates.length },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-[720px] items-center gap-7 px-9 py-3">
          {tabs.map((t) => {
            const active = filter === t.key
            return (
              <button key={t.key} type="button" onClick={() => setFilter(t.key)} className="group flex items-baseline gap-1.5">
                <span
                  className={`text-[11px] transition-colors ${
                    active ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-950 dark:group-hover:text-zinc-50'
                  }`}
                >
                  {t.label}
                </span>
                <span className={`text-[9.5px] tabular-nums ${active ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500/70'}`}>
                  {String(t.n).padStart(2, '0')}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-9 pt-3 pb-28">
          {rows.length === 0 ? <Quiet className="py-10">这一类里没有东西。</Quiet> : null}
          {rows.map((i, idx) => {
            const rejected = i.status === 'rejected'
            const total = i.supports.length + i.weakens.length + i.contradicts.length + i.qualifies.length
            const contested = i.contradicts.length + i.weakens.length + i.qualifies.length > 0
            return (
              <div key={i.id} className={idx > 0 ? 'border-t border-zinc-200 dark:border-zinc-800' : ''}>
                <Row selected={s.selected?.id === i.id} onClick={() => s.select(i.id)} className="py-3.5">
                  <div className="grid grid-cols-[16px_1fr_auto] items-start gap-x-3">
                    <EpiMark value={i.epistemic} className="mt-[4px] text-zinc-400 dark:text-zinc-500" />
                    <div className="min-w-0">
                      <p
                        className={`text-[12.5px] leading-[1.7] ${rejected ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-900/90 dark:text-zinc-100/90'}`}
                      >
                        <span className="line-clamp-2">{i.statement}</span>
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        {total === 0 ? (
                          <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500/80">没有证据</span>
                        ) : (
                          <>
                            {/* 条只在有争议时出现：纯支撑的一整条和一条下划线没区别，
                                而"这一行出现了 amber"本身就是一个信号。 */}
                            {contested ? (
                              <EvidenceStrip
                                supports={i.supports.length}
                                contradicts={i.contradicts.length}
                                weakens={i.weakens.length}
                                qualifies={i.qualifies.length}
                                className="text-zinc-500 dark:text-zinc-400"
                              />
                            ) : null}
                            <span className="text-[9.5px] tabular-nums text-zinc-400 dark:text-zinc-500">
                              {i.supports.length > 0 ? `支撑 ${i.supports.length}` : null}
                              {i.supports.length > 0 && i.contradicts.length > 0 ? ' · ' : null}
                              {i.contradicts.length > 0 ? (
                                <span className="text-amber-700 dark:text-amber-400">反驳 {i.contradicts.length}</span>
                              ) : null}
                              {i.weakens.length > 0 ? ` · 削弱 ${i.weakens.length}` : null}
                            </span>
                          </>
                        )}
                        <span className="text-[9.5px] tracking-[0.04em] text-zinc-400 dark:text-zinc-500/70">
                          {i.assertedBy === 'user' ? '他自己的话' : '系统解释'}
                        </span>
                        {i.status === 'corrected' ? <span className="text-[9.5px] text-amber-700 dark:text-amber-400">你改过</span> : null}
                        {rejected ? <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500/70">你否掉的</span> : null}
                      </div>
                    </div>
                    <span className="pt-[3px] text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500/80">{i.date.slice(5)}</span>
                  </div>
                </Row>
              </div>
            )
          })}

          {showCandidates ? (
            <div className="mt-12">
              <div className="flex items-baseline justify-between border-t border-ink/15 pt-4">
                <Label plain>候选</Label>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">系统在攒的，不是待办</span>
              </div>
              <div className="mt-2">
                {s.candidates.map((c, idx) => {
                  const resolved = c.state === 'resolved'
                  return (
                    <div key={c.id} className={idx > 0 ? 'border-t border-zinc-200 dark:border-zinc-800' : ''}>
                      <Row
                        selected={s.selected?.id === c.id}
                        onClick={() => s.select(c.id, 'candidate')}
                        className="py-3"
                        dim={resolved}
                      >
                        <div className="grid grid-cols-[16px_1fr_auto] items-start gap-x-3">
                          <span
                            className={`mt-[7px] h-[5px] w-[5px] ${
                              c.state === 'emerging' ? 'bg-amber-600 dark:bg-amber-400' : 'bg-zinc-300 dark:bg-zinc-600'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className={`text-[12.5px] leading-[1.7] ${resolved ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-900/90 dark:text-zinc-100/90'}`}>
                              <span className="line-clamp-2">{c.statement}</span>
                            </p>
                            <div className="mt-2 flex items-center gap-3 text-[9.5px] text-zinc-400 dark:text-zinc-500">
                              <span className={c.state === 'emerging' ? 'text-amber-700 dark:text-amber-400' : ''}>
                                {CANDIDATE_STATE_LABEL[c.state]}
                              </span>
                              <span className="text-zinc-400 dark:text-zinc-500/70">
                                {resolved && c.resolution ? c.resolution.note : `${c.signalIds.length} 条记录`}
                              </span>
                            </div>
                          </div>
                          <span className="pt-[3px] text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500/80">{c.firstSeen.slice(5)}</span>
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
