import { useMemo } from 'react'

import {
  CONNECTIONS,
  EVENTS,
  INTERPRETATIONS,
  OBJECTS,
  OBJECT_KIND_LABEL,
  connectionsFor,
  refOf,
} from '../data'
import { Chip, Empty, Section } from '../parts'
import type { Store } from '../store'
import type { ObjectKind } from '../types'

const KINDS: (ObjectKind | 'all')[] = ['all', 'focus', 'project', 'material', 'artifact', 'experience', 'interest', 'goal']

/** 全量视图下按类型分组，避免一条一百多行的瀑布 —— 但这不是分类导航，只是分节。 */
const GROUP_ORDER: ObjectKind[] = ['focus', 'project', 'material', 'artifact', 'experience', 'interest', 'goal']

function renderRailRow(s: Store, id: string, title: string) {
  return (
    <button
      key={id}
      type="button"
      onClick={() => s.select(id)}
      onContextMenu={(e) => {
        e.preventDefault()
        s.openMenu(e, id, 'object')
      }}
      className={`block w-full border-l-2 py-1 pl-2 text-left text-[11px] leading-[15px] ${
        s.selected?.id === id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      <span className="line-clamp-2">{title}</span>
    </button>
  )
}

interface Related {
  id: string
  via: string
}

/**
 * 探索视角。
 *
 * 这里的「图」是**确定性布局**（一圈等分），不是力导向 —— 没有物理模拟，
 * 同一个对象每次都在同一个位置。原型要测的是"看不看得懂关系"，不是"动画好不好看"。
 */
export function ExplorePerspective({ s }: { s: Store }) {
  const id = s.selected?.id ?? null

  const list = useMemo(
    () => OBJECTS.filter((o) => s.kindFilter === 'all' || o.kind === s.kindFilter),
    [s.kindFilter],
  )

  const related = useMemo<Related[]>(() => {
    if (!id) return []
    const seen = new Map<string, string>()
    const add = (other: string, via: string) => {
      if (other === id || seen.has(other)) return
      if (!refOf(other)) return
      seen.set(other, via)
    }
    for (const c of CONNECTIONS) {
      if (c.a === id) add(c.b, '连接')
      if (c.b === id) add(c.a, '连接')
    }
    for (const e of EVENTS) {
      if (!e.objectIds.includes(id)) continue
      for (const o of e.objectIds) add(o, '同一件事')
    }
    for (const i of INTERPRETATIONS) {
      if (i.objectIds.includes(id)) add(i.id, '解释')
    }
    return [...seen.entries()].map(([rid, via]) => ({ id: rid, via })).slice(0, 8)
  }, [id])

  const current = id ? refOf(id) : null

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-[188px] shrink-0 flex-col border-r border-border px-3 py-4">
        <div className="mb-2 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">对象类型</div>
        <div className="flex flex-wrap gap-1">
          {KINDS.map((k) => {
            const active = s.kindFilter === k
            const n = k === 'all' ? OBJECTS.length : OBJECTS.filter((o) => o.kind === k).length
            return (
              <Chip key={k} active={active} onClick={() => s.setKindFilter(k)}>
                {k === 'all' ? '全部' : OBJECT_KIND_LABEL[k]}
                <span className="text-muted-foreground/60">{n}</span>
              </Chip>
            )
          })}
        </div>
        <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
          这个过滤只属于探索。切到时间轴不会跟着走 —— 它过滤的是「怎么摆」，不是「有什么」。
        </p>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-border pt-2">
          {s.kindFilter === 'all'
            ? GROUP_ORDER.map((k) => {
                const items = OBJECTS.filter((o) => o.kind === k)
                if (items.length === 0) return null
                return (
                  <div key={k} className="mb-2">
                    <div className="px-2 pb-0.5 text-[9px] tracking-[0.14em] text-muted-foreground/70 uppercase">
                      {OBJECT_KIND_LABEL[k]}
                    </div>
                    {items.map((o) => renderRailRow(s, o.id, o.title))}
                  </div>
                )
              })
            : list.map((o) => renderRailRow(s, o.id, o.title))}
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
        {!current ? (
          <div>
            <p className="text-[13px] text-foreground">选一个东西开始走。</p>
            <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
              左边是全部 {OBJECTS.length} 个对象。也可以从下面这四处连接进去 ——
              它们是这批数据里结构上真的成立的连接，不是推荐。
            </p>
            <div className="mt-4 space-y-2">
              {CONNECTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => s.select(c.a)}
                  className="block w-full border-l border-border py-1 pl-3 text-left hover:border-foreground"
                >
                  <div className="text-[12px] text-foreground">{refOf(c.a)?.label} ↔ {refOf(c.b)?.label}</div>
                  <div className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{c.why}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <Graph s={s} label={current.label} related={related} />

            <Section label="关系" hint={`${related.length} 条`} className="mt-4">
              {related.length === 0 ? (
                <Empty>这个对象暂时没有连到别的东西。</Empty>
              ) : (
                <div className="divide-y divide-border/60">
                  {related.map((r) => {
                    const ref = refOf(r.id)
                    const conn = connectionsFor(r.id).find((c) => c.a === id || c.b === id)
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => s.select(r.id)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          s.openMenu(e, r.id, ref?.type ?? 'object')
                        }}
                        className="block w-full py-1.5 text-left"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/90">{ref?.label}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{r.via}</span>
                        </div>
                        {conn ? <div className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{conn.why}</div> : null}
                      </button>
                    )
                  })}
                </div>
              )}
            </Section>

            <p className="mt-6 border-t border-border pt-3 text-[10px] leading-4 text-muted-foreground">
              布局是固定的：同一个对象永远在同一条射线上。没有物理模拟，也没有「相关推荐」。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Graph({ s, label, related }: { s: Store; label: string; related: Related[] }) {
  const W = 640
  const H = 300
  const cx = W / 2
  const cy = H / 2
  const R = 108

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-foreground" role="img" aria-label="关系图">
      {related.map((r, i) => {
        const angle = (i / Math.max(1, related.length)) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(angle) * R * 1.9
        const y = cy + Math.sin(angle) * R
        const ref = refOf(r.id)
        return (
          <g key={r.id}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.18} strokeWidth={1} />
            <circle
              cx={x}
              cy={y}
              r={s.selected?.id === r.id ? 5 : 3.5}
              fill={s.selected?.id === r.id ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeOpacity={0.7}
            />
            <text
              x={x}
              y={y + 16}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              fillOpacity={0.66}
              style={{ cursor: 'pointer' }}
              onClick={() => s.select(r.id)}
            >
              {(ref?.label ?? '').length > 12 ? (ref?.label ?? '').slice(0, 11) + '…' : ref?.label}
            </text>
            <circle cx={x} cy={y} r={11} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => s.select(r.id)} />
          </g>
        )
      })}
      <circle cx={cx} cy={cy} r={5} fill="currentColor" />
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize={11} fill="currentColor">
        {label.length > 18 ? label.slice(0, 17) + '…' : label}
      </text>
    </svg>
  )
}
