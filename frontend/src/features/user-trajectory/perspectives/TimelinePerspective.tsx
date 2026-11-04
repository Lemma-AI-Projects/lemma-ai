import { useMemo } from 'react'

import { OBJECTS, PARENT_EVENTS, childrenOf, focusShort, md, topLevelEvents } from '../data'
import { Quiet, Row } from '../parts'
import type { Store } from '../store'
import type { DevEvent, ParentEvent } from '../types'

type Item =
  | { key: string; sort: string; kind: 'parent'; parent: ParentEvent; kids: DevEvent[] }
  | { key: string; sort: string; kind: 'event'; event: DevEvent }

/**
 * 时间轴 = 事情怎么展开的。
 *
 * 这一轮砍掉：左侧 188px 的线索栏（改成顶上一条横排，省下一整列）、
 * 每行的类型标签与形状记号（标题本身已经说明了它是什么）、
 * 每行的「依据 N」（改成标题前一个 1px 的点，只回答"有没有"，不回答"几条"）。
 *
 * 父事件仍然可以展开/收起，因为「一段过程」和「里面的一件事」是两种东西。
 */
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-baseline gap-x-4 gap-y-1 px-8 py-2.5 pl-[42px]">
          <button
            type="button"
            onClick={() => s.setFocusFilter(null)}
            className={
              s.focusFilter === null
                ? 'text-[11px] text-foreground underline decoration-foreground underline-offset-[5px]'
                : 'text-[11px] text-muted-foreground hover:text-foreground'
            }
          >
            全部
          </button>
          {focuses.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => s.setFocusFilter(s.focusFilter === f.id ? null : f.id)}
              className={
                s.focusFilter === f.id
                  ? 'text-[11px] text-foreground underline decoration-foreground underline-offset-[5px]'
                  : 'text-[11px] text-muted-foreground hover:text-foreground'
              }
            >
              {focusShort(f.id, f.title)}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-8 pt-4 pb-24">
          {groups.length === 0 ? <Quiet className="py-10">这条线索上没有事件。</Quiet> : null}
          {groups.map(([month, list]) => (
            <div key={month} className="mb-6">
              <div className="sticky top-0 z-10 bg-background py-1.5 pl-3 text-[10px] tabular-nums text-muted-foreground">
                {month.slice(0, 4)} 年 {Number(month.slice(5))} 月
              </div>
              <div className="mt-1">
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
        </div>
      </div>
    </div>
  )
}

function ParentRow({ s, parent, kids }: { s: Store; parent: ParentEvent; kids: DevEvent[] }) {
  const open = s.expanded.includes(parent.id)
  return (
    <div>
      <Row as="div" selected={s.selected?.id === parent.id} onClick={() => s.select(parent.id, 'parent')} className="py-2">
        <div className="flex items-start gap-2.5">
          <button
            type="button"
            aria-label={open ? '收起' : '展开'}
            onClick={(ev) => {
              ev.stopPropagation()
              s.toggleParent(parent.id)
            }}
            className="w-2.5 shrink-0 pt-[3px] text-[9px] text-muted-foreground hover:text-foreground"
          >
            {open ? '▾' : '▸'}
          </button>
          <span className="w-[86px] shrink-0 pt-[2px] text-[10px] tabular-nums text-muted-foreground">
            {md(parent.from)}–{md(parent.to)}
          </span>
          <span className="min-w-0 flex-1 text-[13px] leading-[1.5] text-foreground">{parent.title}</span>
          {parent.origin === 'system' ? (
            <span className="shrink-0 text-[10px] text-muted-foreground/70">系统并的</span>
          ) : null}
          <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground/70">{kids.length}</span>
        </div>
      </Row>
      {open ? (
        <div className="border-l border-border/70">
          {kids.map((e) => (
            <EventRow key={e.id} s={s} event={e} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function EventRow({ s, event }: { s: Store; event: DevEvent }) {
  return (
    <Row selected={s.selected?.id === event.id} onClick={() => s.select(event.id)}>
      <div className="flex items-start gap-2.5">
        <span className="w-2.5 shrink-0" />
        <span className="w-[52px] shrink-0 pt-[3px] text-[10px] tabular-nums text-muted-foreground">
          {md(event.date)}
          {event.time ? <span className="ml-1 text-muted-foreground/50">{event.time}</span> : null}
        </span>
        <span className="flex w-2 shrink-0 items-center self-center">
          {event.evidenceIds.length > 0 ? (
            <span aria-label="有依据" title="有依据" className="h-[4px] w-[4px] rounded-full bg-foreground/40" />
          ) : null}
        </span>
        <span className="min-w-0 flex-1 text-[12px] leading-[1.6] text-foreground/85">{event.title}</span>
      </div>
    </Row>
  )
}
