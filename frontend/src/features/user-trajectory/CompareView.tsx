import type { ReactNode } from 'react'

import { OBJECT_BY_ID, eventsForObject, insightsForObject, refOf, statusLabel } from './data'
import { PAGE } from './kit'
import { Quiet, TextAction } from './parts'
import type { Store } from './store'

/**
 * 并排比较。它是主区域里的一种视图，不是弹窗 —— 弹窗会盖住它要对比的那些东西。
 * 进入：暂存面板底部。退出：返回或 Esc。
 *
 * 只摆能直接数出来的事实（时间、件数、有没有解释），不排序、不打分。
 * 一旦这里出现一个分数，整页的可信度就没了。
 */
export function CompareView({ s }: { s: Store }) {
  const ids = s.savedObjects.slice(0, 3)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={PAGE}>
        <div className="flex items-baseline justify-between border-b border-border pb-2">
          <span className="text-[11px] text-foreground">并排比较</span>
          <TextAction muted onClick={() => s.setComparing(false)}>
            返回
          </TextAction>
        </div>

        {ids.length < 2 ? (
          <div className="mt-6">
          <Quiet>至少两个对象才能并排。</Quiet>
          <TextAction muted className="mt-2" onClick={() => s.setSheet(true)}>
            打开暂存 →
          </TextAction>
        </div>
        ) : (
          <>
            <table className="mt-4 w-full table-fixed border-collapse align-top">
              <thead>
                <tr>
                  <th className="w-[68px]" />
                  {ids.map((id) => (
                    <th key={id} className="border-l border-border/70 px-3 pb-2 text-left align-top">
                      <div className="text-[12px] leading-[1.5] font-normal text-foreground">{refOf(id)?.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Cell ids={ids} label="时间">
                  {(id) => {
                    const o = OBJECT_BY_ID.get(id)
                    return (
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {o?.from ?? '—'} → {o?.to ?? '至今'}
                      </span>
                    )
                  }}
                </Cell>
                <Cell ids={ids} label="状态">
                  {(id) => <span className="text-[11px] text-muted-foreground">{statusLabel(OBJECT_BY_ID.get(id)?.status ?? '')}</span>}
                </Cell>
                <Cell ids={ids} label="事件">
                  {(id) => (
                    <span className="text-[11px] tabular-nums text-muted-foreground">{eventsForObject(id).length} 件</span>
                  )}
                </Cell>
                <Cell ids={ids} label="证据">
                  {(id) => (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {new Set(eventsForObject(id).flatMap((e) => e.evidenceIds)).size} 条
                    </span>
                  )}
                </Cell>
                <Cell ids={ids} label="解释">
                  {(id) => {
                    const ins = insightsForObject(id)
                    return (
                      <div>
                        <div className="text-[11px] tabular-nums text-muted-foreground">{ins.length} 条</div>
                        {ins.slice(0, 2).map((i) => (
                          <p key={i.id} className="mt-1 line-clamp-3 text-[11px] leading-[1.6] text-foreground/75">
                            {i.statement}
                          </p>
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
                      <span className="text-[11px] leading-[1.5] text-muted-foreground">
                        {last ? `${last.date} ${last.title}` : '没有事件'}
                      </span>
                    )
                  }}
                </Cell>
              </tbody>
            </table>

            <p className="mt-6 text-[10px] leading-[1.6] text-muted-foreground/70">
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
    <tr className="border-t border-border/60">
      <td className="py-2 pr-3 align-top text-[10px] text-muted-foreground/70">{label}</td>
      {ids.map((id) => (
        <td key={id} className="border-l border-border/70 px-3 py-2 align-top">
          {children(id)}
        </td>
      ))}
    </tr>
  )
}
