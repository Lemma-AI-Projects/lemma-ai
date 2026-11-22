import { useMemo } from 'react'

import { OBJECTS, PARENT_EVENTS, childrenOf, focusShort, md, topLevelEvents } from '../data'
import { IconChevron, EventNode } from '../marks'
import { Quiet, Row } from '../parts'
import type { Store } from '../store'
import type { DevEvent, ParentEvent } from '../types'

type Item =
  | { key: string; sort: string; kind: 'parent'; parent: ParentEvent; kids: DevEvent[] }
  | { key: string; sort: string; kind: 'event'; event: DevEvent }

/**
 * 时间轴 = 事情怎么展开的。
 *
 * 这一版多了一条真正的轴：左侧一列竖线 + 节点。节点的形状是事件类型，实心表示这次产出了证据。
 * 父事件不占轴（它是一段区间），子事件落在同一条轴上 —— 展开前后，时间的位置不变。
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
      <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-center gap-x-6 gap-y-2 px-9 py-3">
          <FocusChip s={s} id={null} label="全部" />
          {focuses.map((f) => (
            <FocusChip key={f.id} s={s} id={f.id} label={focusShort(f.id, f.title)} />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-9 pt-1 pb-28">
          {groups.length === 0 ? <Quiet className="py-12">这条线索上没有事件。</Quiet> : null}
          {groups.map(([month, list]) => (
            <div key={month} className="mb-7">
              {/* 月份条与行共用同一套网格：月份对齐日期列，方块落在轴上，横线进标题列。 */}
              <div className="sticky top-0 z-10 -mx-9 bg-zinc-50 dark:bg-zinc-900/95 px-9 pt-1.5 pb-2 backdrop-blur-[2px]">
                <div className="grid grid-cols-[14px_84px_20px_1fr] items-center gap-x-2">
                  <span />
                  <span className="pr-1.5 text-right text-[9.5px] tracking-[0.12em] tabular-nums text-zinc-400 dark:text-zinc-500">
                    {month.slice(0, 4)} 年 {Number(month.slice(5))} 月
                  </span>
                  <span className="flex justify-center">
                    <span className="h-[7px] w-[7px] bg-zinc-300 dark:bg-zinc-700" />
                  </span>
                  <span className="h-px bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
              <div>
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

function FocusChip({ s, id, label }: { s: Store; id: string | null; label: string }) {
  const active = s.focusFilter === id
  return (
    <button
      type="button"
      onClick={() => s.setFocusFilter(active ? null : id)}
      className="group flex items-center gap-2 text-[11px]"
    >
      <span
        className={`h-[5px] w-[5px] transition-colors ${
          active ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-500'
        }`}
      />
      <span className={active ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500 transition-colors group-hover:text-zinc-950 dark:group-hover:text-zinc-50'}>{label}</span>
    </button>
  )
}

/** 竖线 + 节点。父事件不画节点，只让线继续往下走。 */
function Rail({ node }: { node?: DevEvent }) {
  return (
    <div className="relative self-stretch">
      <span className="absolute -top-2 -bottom-2 left-1/2 w-[1.5px] -translate-x-1/2 bg-zinc-300 dark:bg-zinc-700" />
      {node ? (
        <span className="absolute top-[5px] left-1/2 -translate-x-1/2 bg-zinc-50 dark:bg-zinc-900">
          <EventNode kind={node.kind} filled={node.evidenceIds.length > 0} className="text-zinc-900/60 dark:text-zinc-100/60" />
        </span>
      ) : null}
    </div>
  )
}

function ParentRow({ s, parent, kids }: { s: Store; parent: ParentEvent; kids: DevEvent[] }) {
  const open = s.expanded.includes(parent.id)
  return (
    <div>
      <Row
        as="div"
        selected={s.selected?.id === parent.id}
        onClick={() => s.select(parent.id, 'parent')}
        className="py-[8px]"
      >
        <div className="grid grid-cols-[14px_84px_20px_1fr_auto] items-stretch gap-x-2">
          <button
            type="button"
            aria-label={open ? '收起' : '展开'}
            onClick={(ev) => {
              ev.stopPropagation()
              s.toggleParent(parent.id)
            }}
            className="mt-[3px] text-zinc-400 dark:text-zinc-500 transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
          >
            <IconChevron open={open} />
          </button>
          <span className="pt-[1px] pr-1.5 text-right text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
            {md(parent.from)}–{md(parent.to)}
          </span>
          <Rail />
          <span className="min-w-0 text-[13px] leading-[1.55] text-zinc-950 dark:text-zinc-50">{parent.title}</span>
          <span className="flex items-center gap-2 pt-[2px]">
            {parent.origin === 'system' ? (
              <span className="text-[9px] tracking-[0.1em] text-zinc-400 dark:text-zinc-500/80">系统并的</span>
            ) : null}
            <span className="w-4 text-right text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">{kids.length}</span>
          </span>
        </div>
      </Row>
      {open
        ? kids.map((e) => (
            <div key={e.id} className="bg-zinc-900/[0.015] dark:bg-zinc-100/[0.015]">
              <EventRow s={s} event={e} nested />
            </div>
          ))
        : null}
    </div>
  )
}

function EventRow({ s, event, nested }: { s: Store; event: DevEvent; nested?: boolean }) {
  return (
    <Row selected={s.selected?.id === event.id} onClick={() => s.select(event.id)} className="py-[7px]">
      <div className="grid grid-cols-[14px_84px_20px_1fr] items-stretch gap-x-2">
        <span />
        <span className="pt-[2px] pr-1.5 text-right text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
          {md(event.date)}
          {event.time ? <span className="ml-1.5 text-zinc-400 dark:text-zinc-500/60">{event.time}</span> : null}
        </span>
        <Rail node={event} />
        <span className={`min-w-0 text-[12.5px] leading-[1.6] ${nested ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-900/85 dark:text-zinc-100/85'}`}>
          {event.title}
        </span>
      </div>
    </Row>
  )
}
