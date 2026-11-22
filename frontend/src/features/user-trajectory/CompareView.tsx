import type { ReactNode } from 'react'

import { OBJECT_BY_ID, eventsForObject, insightsForObject, refOf, statusLabel } from './data'
import { PAGE } from './kit'
import { EpiMark, IconBack } from './marks'
import { Label, Quiet, TextAction } from './parts'
import type { Store } from './store'

/**
 * 并排比较。它是主区域里的一种视图，不是弹窗 —— 弹窗会盖住它要对比的那些东西。
 *
 * 只摆能直接数出来的事实（时间、件数、有没有解释），不排序、不打分。
 * 一旦这里出现一个分数，整页的可信度就没了。
 */
export function CompareView({ s }: { s: Store }) {
  const ids = s.savedObjects.slice(0, 3)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={PAGE}>
        <div className="flex items-center justify-between border-b border-ink/15 pb-3">
          <Label plain>并排比较</Label>
          <TextAction muted onClick={() => s.setComparing(false)}>
            <IconBack />
            返回
          </TextAction>
        </div>

        {ids.length < 2 ? (
          <div className="mt-8">
            <Quiet>至少两个对象才能并排。</Quiet>
            <TextAction muted className="mt-3" onClick={() => s.setSheet(true)}>
              打开暂存 →
            </TextAction>
          </div>
        ) : (
          <>
            <table className="mt-6 w-full table-fixed border-collapse align-top">
              <thead>
                <tr>
                  <th className="w-[76px]" />
                  {ids.map((id) => (
                    <th key={id} className="border-l border-zinc-200 dark:border-zinc-800 px-4 pb-3 text-left align-top">
                      <div className="text-[13px] leading-[1.5] font-normal text-zinc-950 dark:text-zinc-50">{refOf(id)?.label}</div>
                      <div className="mt-1 text-[9.5px] tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
                        {OBJECT_BY_ID.get(id)?.kind === 'focus' ? '线索' : '对象'}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Cell ids={ids} label="时间">
                  {(id) => {
                    const o = OBJECT_BY_ID.get(id)
                    return (
                      <span className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                        {o?.from ?? '—'} → {o?.to ?? '至今'}
                      </span>
                    )
                  }}
                </Cell>
                <Cell ids={ids} label="状态">
                  {(id) => (
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{statusLabel(OBJECT_BY_ID.get(id)?.status ?? '')}</span>
                  )}
                </Cell>
                <Cell ids={ids} label="事件">
                  {(id) => (
                    <span className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">{eventsForObject(id).length} 件</span>
                  )}
                </Cell>
                <Cell ids={ids} label="证据">
                  {(id) => (
                    <span className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                      {new Set(eventsForObject(id).flatMap((e) => e.evidenceIds)).size} 条
                    </span>
                  )}
                </Cell>
                <Cell ids={ids} label="解释">
                  {(id) => {
                    const ins = insightsForObject(id)
                    return (
                      <div>
                        <div className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">{ins.length} 条</div>
                        {ins.slice(0, 2).map((i) => (
                          <div key={i.id} className="mt-2 flex items-start gap-1.5">
                            <EpiMark value={i.epistemic} size={11} className="mt-[3px] text-zinc-400 dark:text-zinc-500" />
                            <p className="line-clamp-3 text-[11px] leading-[1.6] text-zinc-900/75 dark:text-zinc-100/75">{i.statement}</p>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                </Cell>
                <Cell ids={ids} label="最近一次">
                  {(id) => {
                    const evs = eventsForObject(id)
                    const last = evs[evs.length - 1]
                    return (
                      <span className="text-[11px] leading-[1.6] text-zinc-500 dark:text-zinc-400">
                        {last ? `${last.date} ${last.title}` : '没有事件'}
                      </span>
                    )
                  }}
                </Cell>
              </tbody>
            </table>

            <p className="mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-4 text-[10px] leading-[1.7] text-zinc-400 dark:text-zinc-500">
              这里只摆能数出来的事实。它不排序，也不打分 —— 两个对象并排，不产生任何关于「哪个更重要」的结论。
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Cell({ ids, label, children }: { ids: string[]; label: string; children: (id: string) => ReactNode }) {
  return (
    <tr className="border-t border-zinc-200 dark:border-zinc-800">
      <td className="py-3 pr-3 align-top text-[9.5px] tracking-[0.08em] text-zinc-400 dark:text-zinc-500">{label}</td>
      {ids.map((id) => (
        <td key={id} className="border-l border-zinc-200 dark:border-zinc-800 px-4 py-3 align-top">
          {children(id)}
        </td>
      ))}
    </tr>
  )
}
