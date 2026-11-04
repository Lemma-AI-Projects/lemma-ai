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
import { EpistemicMark, Label, Quiet, RefLink, Rule, TextAction } from '../parts'
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
 * 这一轮砍掉：整张 SVG 关系图（一圈等距节点 + 截断的标签，看懂了也只是"有两条线"）、
 * 左侧 188px 的对象瀑布（一百多行，没有层级也没有搜索）、
 * 以及图下面那份和右栏重复的列表。
 *
 * 换成：一条搜索 + 一段一段的「连接」。每一段回答三件事 ——
 * 连到谁、凭什么算连着、走过去。这是右栏给不了的东西：右栏回答"它是什么"，这里回答"它和什么是同一件事"。
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
      <div className="shrink-0 pt-4">
        <div className="mx-auto flex max-w-[720px] items-baseline gap-3 border-b border-border px-8 pb-2 pl-[42px] focus-within:border-foreground/40">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="找一个材料、项目、事件或解释…"
            className="w-full bg-transparent text-[12px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          {q ? (
            <button type="button" onClick={() => setQ('')} className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground">
              清空
            </button>
          ) : (
            <span className="shrink-0 text-[10px] text-muted-foreground/50">{INDEX.length} 条记录</span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-8 pt-6 pb-24">
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
                  className="-mx-2 block w-full px-2 py-1.5 text-left hover:bg-muted/40"
                >
                  <div className="flex items-baseline gap-2.5">
                    <span className="w-12 shrink-0 text-[10px] text-muted-foreground/70">{r.kind}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/90">{r.text}</span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">{truncate(r.sub, 18)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : q ? (
            <Quiet className="py-8">没有找到。换个词，或者清空后从下面几处开始。</Quiet>
          ) : !current ? (
            <Start s={s} />
          ) : (
            <div>
              <Label>现在在</Label>
              <h2 className="mt-1.5 font-serif text-[15px] leading-[1.5] text-foreground">{current.label}</h2>
              <p className="mt-1 text-[12px] leading-[1.6] text-muted-foreground">{current.sub}</p>

              <div className="mt-5">
                <div className="flex items-baseline justify-between">
                  <Label>连到</Label>
                  <span className="text-[10px] text-muted-foreground/60">{conns.length} 处</span>
                </div>
                {conns.length === 0 ? (
                  <Quiet className="mt-2">
                    它是个孤岛：没有连到别的东西{coOccurring.length === 0 ? '，也没有和谁同框' : ''}。这在数据里很常见 ——
                    大多数记录都不会连成网。
                  </Quiet>
                ) : (
                  <div className="mt-1.5">
                    {conns.map((c) => (
                      <ConnBlock key={c.id} s={s} c={c} from={id as string} />
                    ))}
                  </div>
                )}
              </div>

              {coOccurring.length > 0 ? (
                <div className="mt-6">
                  <div className="flex items-baseline justify-between">
                    <Label>同一次活动里提到过</Label>
                    <span className="text-[10px] text-muted-foreground/60">同框，不等于有关系</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    {coOccurring.map((o) => (
                      <RefLink key={o} s={s} id={o} className="text-[11px] text-muted-foreground" />
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

function Start({ s }: { s: Store }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label>从这几处开始</Label>
        <span className="text-[10px] text-muted-foreground/60">结构上成立的连接，不是推荐</span>
      </div>
      <div className="mt-1.5">
        {CONNECTIONS.map((c) => (
          <div key={c.id} className="border-l border-border/80 py-2 pl-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <RefLink s={s} id={c.a} className="text-[13px] text-foreground" />
              <span className="text-[10px] text-muted-foreground/40">↔</span>
              <RefLink s={s} id={c.b} className="text-[13px] text-foreground" />
              <EpistemicMark value={c.epistemic} compact className="ml-1" />
            </div>
            <p className="mt-1 max-w-[46em] text-[12px] leading-[1.75] text-muted-foreground">{c.why}</p>
            <div className="mt-1.5 flex items-baseline gap-3">
              {c.basisIds.length > 0 ? (
                <span className="flex flex-wrap items-baseline gap-2 text-[10px] text-muted-foreground/70">
                  依据
                  {c.basisIds.map((b) => (
                    <RefLink key={b} s={s} id={b} className="text-[10px] text-muted-foreground/70">
                      {truncate(refOf(b)?.label ?? b, 16)}
                    </RefLink>
                  ))}
                </span>
              ) : null}
              <TextAction muted className="ml-auto" onClick={() => s.select(c.a)}>
                走进去 →
              </TextAction>
            </div>
          </div>
        ))}
      </div>
      <Rule className="mt-6" />
      <Quiet className="mt-3">也可以在上面搜任何一条记录，从它开始走。</Quiet>
    </div>
  )
}

function ConnBlock({ s, c, from }: { s: Store; c: ConnectionRec; from: string }) {
  const other = c.a === from ? c.b : c.a
  const o = OBJECT_BY_ID.get(other)
  return (
    <div className="border-l border-border/80 py-2 pl-3">
      <div className="flex items-baseline gap-2">
        <RefLink s={s} id={other} className="text-[13px] text-foreground" />
        {o ? <span className="text-[10px] text-muted-foreground/60">{OBJECT_KIND_LABEL[o.kind]}</span> : null}
        <EpistemicMark value={c.epistemic} compact />
        <TextAction muted className="ml-auto shrink-0" onClick={() => s.select(other)}>
          走过去 →
        </TextAction>
      </div>
      <p className="mt-1 max-w-[46em] text-[12px] leading-[1.75] text-muted-foreground">{c.why}</p>
      {c.basisIds.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-2 text-[10px] text-muted-foreground/70">
          依据
          {c.basisIds.map((b) => (
            <RefLink key={b} s={s} id={b} className="text-[10px] text-muted-foreground/70">
              {truncate(refOf(b)?.label ?? b, 16)}
            </RefLink>
          ))}
        </div>
      ) : null}
    </div>
  )
}
