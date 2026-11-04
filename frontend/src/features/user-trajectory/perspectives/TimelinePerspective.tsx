import { useMemo } from 'react'

import { EVENT_KIND_LABEL, OBJECTS, PARENT_EVENTS, childrenOf, md, topLevelEvents } from '../data'
import { Chip, Empty, SelectRow } from '../parts'
import type { Store } from '../store'
import type { DevEvent, ParentEvent } from '../types'

type Item =
  | { key: string; sort: string; kind: 'parent'; parent: ParentEvent; kids: DevEvent[] }
  | { key: string; sort: string; kind: 'event'; event: DevEvent }

/** 事件左端那枚记号。形状表示类型，不用颜色。 */
const KIND_GLYPH: Record<DevEvent['kind'], string> = {
  learning: '·',
  research: '≈',
  creation: '＋',
  reflection: '~',
  direction: '→',
  milestone: '◆',
}

export function TimelinePerspective({ s }: { s: Store }) {
  const focuses = OBJECTS.filter((o) => o.kind === 'focus')

  const items = useMemo<Item[]>(() => {
    const hit = (e: DevEvent) => !s.focusFilter || e.focusIds.includes(s.focusFilter)
    const out: Item[] = []

    for (const p of PARENT_EVENTS) {
      const kids = childrenOf(p.id).filter(hit)
      const parentHit = !s.focusFilter || p.objectIds.includes(s.focusFilter)
      if (s.split.includes(p.id)) {
        kids.forEach((e) => out.push({ key: e.id, sort: e.date, kind: 'event', event: e }))
        continue
      }
      if (!kids.length && !parentHit) continue
      out.push({ key: p.id, sort: p.from, kind: 'parent', parent: p, kids })
    }
    for (const e of topLevelEvents()) if (hit(e)) out.push({ key: e.id, sort: e.date, kind: 'event', event: e })
    return out.sort((a, b) => a.sort.localeCompare(b.sort))
  }, [s.focusFilter, s.split])

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>()
    for (const it of items) {
      const m = it.sort.slice(0, 7)
      if (!map.has(m)) map.set(m, [])
      map.get(m)!.push(it)
    }
    return [...map.entries()]
  }, [items])

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-[188px] shrink-0 border-r border-border px-3 py-4">
        <div className="mb-2 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">线索</div>
        <button
          type="button"
          onClick={() => s.setFocusFilter(null)}
          className={`block w-full border-l-2 py-1 pl-2 text-left text-[12px] ${
            s.focusFilter === null ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          全部
        </button>
        {focuses.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => s.setFocusFilter(f.id)}
            className={`block w-full border-l-2 py-1 pl-2 text-left text-[11px] leading-[15px] ${
              s.focusFilter === f.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="line-clamp-2">{f.title}</span>
          </button>
        ))}
        <p className="mt-4 border-t border-border pt-3 text-[10px] leading-4 text-muted-foreground">
          这个过滤只在时间轴生效 —— 切到探索不会带过去。
        </p>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
        {groups.length === 0 ? <Empty>这条线索上没有事件。</Empty> : null}
        {groups.map(([month, list]) => (
          <div key={month} className="mb-5">
            <div className="sticky top-0 z-10 -mx-6 mb-1 bg-background/95 px-6 py-1 text-[10px] tracking-[0.18em] text-muted-foreground">
              {month.replace('-', ' 年 ')} 月
            </div>
            <div className="space-y-0.5">
              {list.map((it) =>
                it.kind === 'parent' ? (
                  <ParentRow key={it.key} s={s} parent={it.parent} kids={it.kids} />
                ) : (
                  <EventRow key={it.key} s={s} event={it.event} />
                ),
              )}
            </div>
          </div>
        ))}
        <p className="mt-6 border-t border-border pt-3 text-[10px] leading-4 text-muted-foreground">
          父事件是「一段过程」，子事件是「里面的一件事」。系统并出来的可以拆开。
        </p>
      </div>
    </div>
  )
}

function ParentRow({ s, parent, kids }: { s: Store; parent: ParentEvent; kids: DevEvent[] }) {
  const open = s.expanded.includes(parent.id)
  const sel = s.selected?.id === parent.id
  return (
    <div>
      <SelectRow as="div" selected={sel} onClick={() => s.select(parent.id, 'parent')}>
        <div className="flex items-baseline gap-2">
          <button
            type="button"
            aria-label={open ? '收起' : '展开'}
            onClick={(ev) => {
              ev.stopPropagation()
              s.toggleParent(parent.id)
            }}
            className="w-3 shrink-0 text-[10px] text-muted-foreground hover:text-foreground"
          >
            {open ? '▾' : '▸'}
          </button>
          <span className="w-[86px] shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {md(parent.from)}–{md(parent.to)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{parent.title}</span>
          {parent.origin === 'system' ? (
            <span className="shrink-0 text-[10px] text-muted-foreground" title="系统按时间和项目并出来的，可以拆">
              系统并的
            </span>
          ) : (
            <span className="shrink-0 text-[10px] text-muted-foreground">他划的</span>
          )}
          <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{kids.length} 件</span>
        </div>
      </SelectRow>
      {open ? (
        <div className="ml-[26px] border-l border-dashed border-border pl-2">
          {kids.map((e) => (
            <EventRow key={e.id} s={s} event={e} compact />
          ))}
          {parent.origin === 'system' ? (
            <button
              type="button"
              onClick={() => s.splitParent(parent.id)}
              className="mt-1 mb-1 text-[10px] text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground"
            >
              拆开这一段
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function EventRow({ s, event, compact }: { s: Store; event: DevEvent; compact?: boolean }) {
  const sel = s.selected?.id === event.id
  return (
    <SelectRow
      selected={sel}
      onClick={() => s.select(event.id)}
      onContextMenu={(e) => {
        e.preventDefault()
        s.openMenu(e, event.id, 'event')
      }}
      className={compact ? 'py-1' : undefined}
    >
      <div className="flex items-baseline gap-2">
        <span className="w-3 shrink-0 text-center text-[11px] text-muted-foreground">{KIND_GLYPH[event.kind]}</span>
        <span className="w-[74px] shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {md(event.date)}
          {event.time ? <span className="ml-1 text-muted-foreground/60">{event.time}</span> : null}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/90">{event.title}</span>
        {event.evidenceIds.length > 0 ? (
          <Chip className="shrink-0">依据 {event.evidenceIds.length}</Chip>
        ) : null}
        <span className="shrink-0 text-[10px] text-muted-foreground/60">{EVENT_KIND_LABEL[event.kind]}</span>
      </div>
    </SelectRow>
  )
}
