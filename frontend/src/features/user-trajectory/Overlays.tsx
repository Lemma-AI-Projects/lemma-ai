import { EVIDENCE_BY_ID, INTERPRETATION_BY_ID, OBJECT_BY_ID, eventsForObject, insightsForObject, refOf } from './data'
import type { Store } from './store'

/**
 * 右键菜单 / ⋯ 菜单。
 *
 * 两段：**探索**（不改变你在哪，只把相关的东西摆出来）与**动作**（会改变你的状态）。
 * 菜单项随对象类型变 —— 一个材料没有「看产出」，一条证据没有「对比」。
 */
export function ContextMenu({ s }: { s: Store }) {
  const m = s.menu
  if (!m) return null
  const ref = refOf(m.id)
  if (!ref) return null

  const isObject = m.type === 'object'
  const isInsight = m.type === 'insight'
  const isEvent = m.type === 'event' || m.type === 'parent'

  const relatedEvents = isObject ? eventsForObject(m.id) : []
  const relatedInsights = isObject ? insightsForObject(m.id) : []

  const items: { label: string; run: () => void }[] = []
  const actions: { label: string; run: () => void }[] = []

  if (isObject || isEvent) {
    items.push({
      label: '探索它的连接',
      run: () => {
        s.select(m.id)
        s.switchPerspective('explore')
      },
    })
  }
  if (isObject) {
    items.push({
      label: `看相关事件（${relatedEvents.length}）`,
      run: () => {
        s.switchPerspective('timeline')
        s.select(m.id)
      },
    })
    items.push({
      label: `看相关解释（${relatedInsights.length}）`,
      run: () => {
        s.switchPerspective('insights')
        if (relatedInsights[0]) s.select(relatedInsights[0].id)
      },
    })
  }
  if (isInsight) {
    const ins = s.insights.find((i) => i.id === m.id) ?? INTERPRETATION_BY_ID.get(m.id)
    const first = ins && ins.supports[0]
    items.push({
      label: '看它的依据',
      run: () => {
        if (first) s.select(first, 'evidence')
      },
    })
    items.push({
      label: '看它在说哪些对象',
      run: () => {
        const o = ins?.objectIds[0]
        if (o) s.select(o)
      },
    })
  }
  if (m.type === 'evidence') {
    const ev = EVIDENCE_BY_ID.get(m.id)
    items.push({
      label: '回到产生它的那次活动',
      run: () => {
        if (ev?.activityId) s.select(ev.activityId)
      },
    })
  }

  actions.push({ label: '存入集合', run: () => s.saveToCollection(m.id, m.type) })
  actions.push({ label: '加一句话', run: () => s.saveToCollection(m.id, m.type) })
  if (isObject) actions.push({ label: s.compare.includes(m.id) ? '移出对比' : '放进对比', run: () => s.toggleCompare(m.id) })

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={s.closeMenu} onContextMenu={(e) => e.preventDefault()} />
      <div
        className="fixed z-50 w-[220px] border border-border bg-popover py-1 text-popover-foreground shadow-sm"
        style={{ left: Math.min(m.x, window.innerWidth - 236), top: Math.min(m.y, window.innerHeight - 240) }}
      >
        <div className="truncate px-2 py-1 text-[10px] text-muted-foreground">
          {ref.label}
        </div>
        <div className="my-1 border-t border-border" />
        <div className="px-2 pb-0.5 text-[9px] tracking-[0.16em] text-muted-foreground uppercase">探索</div>
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={() => {
              it.run()
              s.closeMenu()
            }}
            className="block w-full px-2 py-1 text-left text-[12px] hover:bg-muted"
          >
            {it.label}
          </button>
        ))}
        <div className="my-1 border-t border-border" />
        <div className="px-2 pb-0.5 text-[9px] tracking-[0.16em] text-muted-foreground uppercase">动作</div>
        {actions.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={() => {
              it.run()
              s.closeMenu()
            }}
            className="block w-full px-2 py-1 text-left text-[12px] hover:bg-muted"
          >
            {it.label}
          </button>
        ))}
      </div>
    </>
  )
}

export function CompareDialog({ s }: { s: Store }) {
  if (!s.compareOpen) return null
  const ids = s.compare
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 p-8" onClick={() => s.setCompareOpen(false)}>
      <div className="w-full max-w-[880px] border border-border bg-background" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">对比 {ids.length} 个对象</span>
          <button type="button" onClick={() => s.setCompareOpen(false)} className="text-[11px] text-muted-foreground hover:text-foreground">
            关闭
          </button>
        </div>
        {ids.length < 2 ? (
          <p className="px-4 py-6 text-[12px] text-muted-foreground">至少选两个。在对象上用 ⋯ 或右键都能放进来。</p>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: `repeat(${ids.length}, minmax(0, 1fr))` }}>
            {ids.map((id) => {
              const o = OBJECT_BY_ID.get(id)
              const evs = eventsForObject(id)
              const ins = insightsForObject(id)
              const evCount = new Set(evs.flatMap((e) => e.evidenceIds)).size
              return (
                <div key={id} className="border-r border-border px-3 py-3 last:border-r-0">
                  <div className="text-[10px] text-muted-foreground">{o?.meta}</div>
                  <div className="mt-1 text-[12px] leading-5 text-foreground">{o?.title}</div>
                  <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                    <div>时间 {o?.from} → {o?.to ?? '至今'}</div>
                    <div>事件 {evs.length} · 证据 {evCount} · 解释 {ins.length}</div>
                  </div>
                  <div className="mt-2 border-t border-border/70 pt-2">
                    {ins.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">没有解释挂在它上面。</p>
                    ) : (
                      ins.slice(0, 2).map((i) => (
                        <p key={i.id} className="line-clamp-3 text-[10px] leading-4 text-foreground/75">
                          {i.statement}
                        </p>
                      ))
                    )}
                  </div>
                  <button type="button" onClick={() => s.toggleCompare(id)} className="mt-2 text-[10px] text-muted-foreground hover:text-foreground">
                    移出
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <p className="border-t border-border px-4 py-2 text-[10px] leading-4 text-muted-foreground">
          对比只摆事实：时间、数量、有没有解释挂着。它不排序，也不打分。
        </p>
      </div>
    </div>
  )
}

export function CollectionDrawer({ s }: { s: Store }) {
  if (!s.drawer) return null
  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-[340px] flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">我的集合</span>
        <button type="button" onClick={() => s.setDrawer(false)} className="text-[11px] text-muted-foreground hover:text-foreground">
          收起
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {s.collection.length === 0 ? (
          <p className="text-[11px] leading-4 text-muted-foreground">
            空着。用右键或 ⋯ 把东西放进来 —— 放进来只是**这一次探索**的临时结构，不动底下任何记录。
          </p>
        ) : (
          <div className="space-y-3">
            {s.collection.map((c) => {
              const ref = refOf(c.refId)
              return (
                <div key={c.key} className="border-l border-border pl-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">{ref?.label}</span>
                    <span className="shrink-0 text-[9px] text-muted-foreground">{c.state === 'saved' ? '已留下' : '临时的'}</span>
                  </div>
                  <input
                    value={c.note}
                    onChange={(e) => s.setItemNote(c.key, e.target.value)}
                    placeholder="加一句话…"
                    className="mt-1 w-full border-b border-border bg-transparent py-0.5 text-[11px] outline-none placeholder:text-muted-foreground/60 focus:border-foreground/40"
                  />
                  <div className="mt-1 flex gap-2 text-[10px]">
                    {c.state === 'ephemeral' ? (
                      <button type="button" onClick={() => s.keepItem(c.key)} className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground">
                        留下
                      </button>
                    ) : null}
                    <button type="button" onClick={() => s.promoteItem(c.key)} className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground">
                      提出为理解
                    </button>
                    <button type="button" onClick={() => s.removeFromCollection(c.key)} className="text-muted-foreground hover:text-foreground">
                      移走
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <p className="border-t border-border px-4 py-2 text-[10px] leading-4 text-muted-foreground">
        「提出为理解」只是把它变成一条**假设**（○），作者是你。它不会自己变成结论，也不会改任何原始记录。
      </p>
    </div>
  )
}
