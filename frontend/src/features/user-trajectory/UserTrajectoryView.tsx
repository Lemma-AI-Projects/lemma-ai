import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import { CompareView } from './CompareView'
import { DetailPanel } from './DetailPanel'
import { refOf } from './data'
import { ExplorePerspective } from './perspectives/ExplorePerspective'
import { InsightsPerspective } from './perspectives/InsightsPerspective'
import { OverviewPerspective } from './perspectives/OverviewPerspective'
import { TimelinePerspective } from './perspectives/TimelinePerspective'
import { CollectionSheet } from './Sheet'
import { useTrajectoryStore, type Perspective } from './store'

const TABS: { key: Perspective; label: string; question: string }[] = [
  { key: 'overview', label: '概览', question: '有什么值得发现' },
  { key: 'timeline', label: '时间轴', question: '事情是怎么展开的' },
  { key: 'explore', label: '探索', question: '它连着什么' },
  { key: 'insights', label: '理解', question: '浮现出什么模式' },
]

/**
 * User Trajectory 的低保真原型。
 *
 * 一个信息空间，一个选中，一块详情面板，一个按需打开的暂存面板。
 * 没有第三个浮层，也没有第二个选中态。
 */
export function UserTrajectoryView() {
  // 评审用：任何状态都能用一条链接指出来，截图可复现。
  // ?view=overview|timeline|explore|insights · ?sel=<id> · ?compare=1 · ?sheet=1 · ?save=a,b
  const [params] = useSearchParams()
  const viewParam = params.get('view')
  const perspective: Perspective =
    viewParam === 'timeline' || viewParam === 'explore' || viewParam === 'insights' ? viewParam : 'overview'
  const selParam = params.get('sel')
  const initialSelected = selParam && refOf(selParam) ? { id: selParam, type: refOf(selParam)!.type } : undefined
  const s = useTrajectoryStore({ perspective, selected: initialSelected, comparing: params.get('compare') === '1', sheet: params.get('sheet') === '1', saved: (params.get('save') ?? '').split(',').filter(Boolean) })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (s.sheet) s.setSheet(false)
      else if (s.comparing) s.setComparing(false)
      else if (s.selected) s.closeDetail()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s.sheet, s.comparing, s.selected, s])

  const detail = s.selected && !s.comparing

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-11 shrink-0 items-center gap-10 border-b border-border px-6">
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="text-[13px] text-foreground">陈知远</span>
          <span className="text-[10px] tabular-nums text-muted-foreground/60">2026.01 — 11</span>
          <span className="border border-border/80 px-1 text-[9px] leading-[13px] text-muted-foreground/60">合成数据</span>
        </div>

        <nav className="flex shrink-0 items-baseline gap-5">
          {TABS.map((t) => {
            const active = s.perspective === t.key && !s.comparing
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => s.switchPerspective(t.key)}
                title={t.question}
                className={
                  active
                    ? 'text-[12px] text-foreground underline decoration-foreground underline-offset-[6px]'
                    : 'text-[12px] text-muted-foreground hover:text-foreground'
                }
              >
                {t.label}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-baseline gap-4">
          <span className="w-[150px] text-right text-[10px] text-muted-foreground/80">{s.flash ?? ''}</span>
          <button
            type="button"
            onClick={() => s.setSheet(true)}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            暂存
            {s.collection.length > 0 ? (
              <span className="ml-1 text-[10px] tabular-nums text-foreground">{s.collection.length}</span>
            ) : null}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {s.comparing ? <CompareView s={s} /> : null}
          {!s.comparing && s.perspective === 'overview' ? <OverviewPerspective s={s} /> : null}
          {!s.comparing && s.perspective === 'timeline' ? <TimelinePerspective s={s} /> : null}
          {!s.comparing && s.perspective === 'explore' ? <ExplorePerspective s={s} /> : null}
          {!s.comparing && s.perspective === 'insights' ? <InsightsPerspective s={s} /> : null}
        </main>
        {detail ? (
          <aside className="w-[340px] shrink-0 overflow-hidden border-l border-border">
            <DetailPanel s={s} />
          </aside>
        ) : null}
      </div>

      <CollectionSheet s={s} />
    </div>
  )
}
