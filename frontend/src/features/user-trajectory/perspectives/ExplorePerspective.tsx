import { useMemo, useState } from 'react'

import {
  CONNECTIONS,
  EVENTS,
  INTERPRETATIONS,
  OBJECTS,
  OBJECT_BY_ID,
  OBJECT_KIND_LABEL,
  refOf,
} from '../data'
import { truncate } from '../kit'
import { IconLink, IconSearch } from '../marks'
import { EpistemicMark, Label, Quiet, RefLink, TextAction } from '../parts'
import type { Store } from '../store'
import type { RefType } from '../data'
import type { ConnectionRec } from '../types'

const INDEX: { id: string; type: RefType; text: string; sub: string; kind: string }[] = [
  ...OBJECTS.map((o) => ({ id: o.id, type: 'object' as RefType, text: o.title, sub: o.sub, kind: OBJECT_KIND_LABEL[o.kind] })),
  ...EVENTS.map((e) => ({ id: e.id, type: 'event' as RefType, text: e.title, sub: e.date, kind: '事件' })),
  ...INTERPRETATIONS.map((i) => ({ id: i.id, type: 'insight' as RefType, text: i.statement, sub: i.date, kind: '解释' })),
]

/**
 * 探索 = 它连着什么。
 *
 * 上一版把 SVG 关系图整个删了，只剩一列文字块 —— 那是从"图不好看"跳到"没有图"。
 * 这一版补回来，但只补一张小的：当前对象在下方中心，相关的东西扇形铺开，
 * 边的样式就是它的性质（实线=结构上成立，虚线=需要一点判断，amber=互相矛盾）。
 * 下面那列文字不再是"关系列表"，而是"凭什么算连着"的解释。
 */
export function ExplorePerspective({ s }: { s: Store }) {
  const [q, setQ] = useState('')
  const id = s.selected?.id ?? null
  const current = id ? refOf(id) : null

  const results = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return []
    return INDEX.filter((r) => r.text.toLowerCase().includes(k) || r.sub.toLowerCase().includes(k)).slice(0, 24)
  }, [q])

  const conns = useMemo(() => (id ? CONNECTIONS.filter((c) => c.a === id || c.b === id) : []), [id])

  const edges = useMemo(
    () =>
      conns.map((c) => ({
        c,
        other: c.a === id ? c.b : c.a,
      })),
    [conns, id],
  )

  /** 同一件事里被提到过的其他东西。比「连接」弱：只是同框，不代表有关系。 */
  const coOccurring = useMemo(() => {
    if (!id) return []
    const seen = new Set<string>()
    for (const e of EVENTS) {
      if (!e.objectIds.includes(id)) continue
      for (const o of e.objectIds) if (o !== id) seen.add(o)
    }
    return [...seen].slice(0, 8)
  }, [id])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <div className="mx-auto flex max-w-[720px] items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 px-9 py-3">
          <IconSearch className="text-zinc-400 dark:text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="找一个材料、项目、事件或解释…"
            className="w-full bg-transparent text-[12px] text-zinc-950 dark:text-zinc-50 outline-none placeholder:text-zinc-400 dark:text-zinc-500/80"
          />
          <span className="shrink-0 text-[9.5px] tracking-[0.12em] tabular-nums text-zinc-400 dark:text-zinc-500/70">
            {q ? `${results.length} 条` : `${INDEX.length} 条记录`}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-9 pt-7 pb-28">
          {results.length > 0 ? (
            <div>
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    s.select(r.id, r.type)
                    setQ('')
                  }}
                  className="-mx-2 block w-full px-2 py-1.5 text-left transition-colors hover:bg-zinc-900/[0.03] dark:bg-zinc-100/[0.03]"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="w-12 shrink-0 text-[9.5px] tracking-[0.08em] text-zinc-400 dark:text-zinc-500">{r.kind}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-900/90 dark:text-zinc-100/90">{r.text}</span>
                    <span className="shrink-0 text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500/70">{truncate(r.sub, 16)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : q ? (
            <Quiet className="py-10">没有找到。换个词，或者清空后从下面几处开始。</Quiet>
          ) : !current ? (
            <Start s={s} />
          ) : (
            <div>
              <Label>现在在</Label>
              <h2 className="mt-2 font-serif text-[19px] leading-[1.45] tracking-[-0.005em] text-zinc-950 dark:text-zinc-50">{current.label}</h2>
              <p className="mt-2 max-w-[40em] text-[12px] leading-[1.8] text-zinc-500 dark:text-zinc-400">{current.sub}</p>

              {edges.length > 1 ? <Bracket s={s} edges={edges} /> : null}

              <div className="mt-2">
                <div className="flex items-baseline justify-between">
                  <Label>凭什么算连着</Label>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{conns.length} 处</span>
                </div>
                {conns.length === 0 ? (
                  <Quiet className="mt-3">
                    它是个孤岛：没有连到别的东西{coOccurring.length === 0 ? '，也没有和谁同框' : ''}。这在数据里很常见 ——
                    大多数记录都不会连成网。
                  </Quiet>
                ) : (
                  <div className="mt-3">
                    {edges.map(({ c, other }) => (
                      <ConnBlock key={c.id} s={s} c={c} other={other} />
                    ))}
                  </div>
                )}
              </div>

              {coOccurring.length > 0 ? (
                <div className="mt-10 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                  <div className="flex items-baseline justify-between">
                    <Label>同一次活动里提到过</Label>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">同框，不等于有关系</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                    {coOccurring.map((o) => (
                      <RefLink key={o} s={s} id={o} className="text-[11px] text-zinc-500 dark:text-zinc-400" />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 关系括号。
 *
 * 试过扇形：只有一处连接时整张图会缩成一个悬空的点，标签还压在基线上。
 * 换成"当前对象 → 一路横向母线 → 各个相关对象"的括号，一处和八处都成立，
 * 位置也确定：同样的数据永远画成同样的样子。
 */
function Bracket({ s, edges }: { s: Store; edges: { c: ConnectionRec; other: string }[] }) {
  const W = 648
  const H = 104
  const mid = W / 2
  const n = edges.length
  const busY = 40
  const nodeY = 62
  // 节点靠近中心排，不许拉到页面两头 —— 两处分叉铺满 648px 会被读成一条横线。
  const gap = Math.min(210, (W - 200) / Math.max(1, n - 1))
  const startX = mid - (gap * (n - 1)) / 2
  const xs = edges.map((_, i) => startX + i * gap)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="mt-3 overflow-visible" role="img" aria-label="关系图">
      <circle cx={mid} cy={8} r={4.2} className="text-zinc-900 dark:text-zinc-50" fill="currentColor" />
      <line
        x1={mid}
        y1={12}
        x2={mid}
        y2={busY}
        className="text-zinc-300 dark:text-zinc-700"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      {n > 1 ? (
        <line
          x1={Math.min(...xs)}
          y1={busY}
          x2={Math.max(...xs)}
          y2={busY}
          className="text-zinc-300 dark:text-zinc-700"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      ) : null}

      {edges.map((e, i) => {
        const x = xs[i]
        const contradiction = e.c.kind === 'contradiction'
        const dashed = e.c.epistemic === 'interpretation'
        // 矛盾是信号色 amber；普通连接一律墨色 zinc。其余全部 currentColor。
        const ink = contradiction ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-zinc-100'
        const ref = refOf(e.other)
        return (
          <g key={e.c.id} className="cursor-pointer" onClick={() => s.select(e.other)}>
            <line
              x1={x}
              y1={n === 1 ? 12 : busY}
              x2={x}
              y2={nodeY - 3}
              className={ink}
              stroke="currentColor"
              strokeOpacity={contradiction ? 0.9 : 0.7}
              strokeWidth="1.1"
              strokeDasharray={dashed ? '2 3' : undefined}
            />
            <circle
              cx={x}
              cy={nodeY}
              r="4.2"
              fill="none"
              className={ink}
              stroke="currentColor"
              strokeOpacity={contradiction ? 1 : 0.75}
              strokeWidth="1.1"
            />
            <text x={x} y={nodeY + 20} textAnchor="middle" fontSize="10" className="text-zinc-500 dark:text-zinc-400" fill="currentColor">
              {truncate(ref?.label ?? '', 12)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function Start({ s }: { s: Store }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label>从这几处开始</Label>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">结构上成立的连接，不是推荐</span>
      </div>
      <div className="mt-4">
        {CONNECTIONS.map((c) => (
          <div key={c.id} className="border-l border-zinc-200 dark:border-zinc-800 py-3 pl-4">
            <div className="flex items-baseline gap-x-2.5">
              <RefLink s={s} id={c.a} className="text-[13px] leading-[1.5] text-zinc-950 dark:text-zinc-50">
                <span className="line-clamp-2">{refOf(c.a)?.label}</span>
              </RefLink>
              <IconLink size={16} className="shrink-0 text-zinc-400 dark:text-zinc-500/70" />
              <RefLink s={s} id={c.b} className="text-[13px] leading-[1.5] text-zinc-950 dark:text-zinc-50">
                <span className="line-clamp-2">{refOf(c.b)?.label}</span>
              </RefLink>
              <EpistemicMark value={c.epistemic} compact className="ml-1 shrink-0" />
            </div>
            <p className="mt-1.5 max-w-[44em] text-[12px] leading-[1.8] text-zinc-500 dark:text-zinc-400">{c.why}</p>
            {c.basisIds.length > 0 ? (
              <div className="mt-2">
                <Label plain>依据</Label>
                {c.basisIds.slice(0, 3).map((b) => (
                  <div key={b} className="mt-1">
                    <RefLink s={s} id={b} className="text-[11px] leading-[1.6] text-zinc-400 dark:text-zinc-500">
                      <span className="line-clamp-1">{truncate(refOf(b)?.label ?? b, 44)}</span>
                    </RefLink>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-4 text-[11px] text-zinc-400 dark:text-zinc-500">
        也可以在上面搜任何一条记录，从它开始走。
      </p>
    </div>
  )
}

function ConnBlock({ s, c, other }: { s: Store; c: ConnectionRec; other: string }) {
  const o = OBJECT_BY_ID.get(other)
  const contradiction = c.kind === 'contradiction'
  return (
    <div className={`border-l py-3 pl-4 ${contradiction ? 'border-amber-400/70 dark:border-amber-500/40' : 'border-zinc-200 dark:border-zinc-800'}`}>
      <div className="flex items-baseline gap-2.5">
        <IconLink
          size={16}
          dashed={c.epistemic === 'interpretation'}
          className={contradiction ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500'}
        />
        <RefLink s={s} id={other} className="text-[13px] leading-[1.5] text-zinc-950 dark:text-zinc-50" />
        {o ? <span className="text-[9.5px] tracking-[0.08em] text-zinc-400 dark:text-zinc-500">{OBJECT_KIND_LABEL[o.kind]}</span> : null}
        <TextAction muted className="ml-auto shrink-0" onClick={() => s.select(other)}>
          走过去
        </TextAction>
      </div>
      <p className="mt-1.5 max-w-[44em] text-[12px] leading-[1.8] text-zinc-500 dark:text-zinc-400">{c.why}</p>
      {c.basisIds.length > 0 ? (
        <div className="mt-2">
          <Label plain>依据</Label>
          {c.basisIds.slice(0, 3).map((b) => (
            <div key={b} className="mt-1">
              <RefLink s={s} id={b} className="text-[11px] leading-[1.6] text-zinc-400 dark:text-zinc-500">
                <span className="line-clamp-1">{truncate(refOf(b)?.label ?? b, 44)}</span>
              </RefLink>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
