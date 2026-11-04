import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { SUMMARY, refOf } from './data'
import { Inspector } from './Inspector'
import { CollectionDrawer, CompareDialog, ContextMenu } from './Overlays'
import { ExplorePerspective } from './perspectives/ExplorePerspective'
import { InsightsPerspective } from './perspectives/InsightsPerspective'
import { OverviewPerspective } from './perspectives/OverviewPerspective'
import { TimelinePerspective } from './perspectives/TimelinePerspective'
import { useTrajectoryStore, type Perspective } from './store'

const TABS: { key: Perspective; label: string; question: string }[] = [
  { key: 'overview', label: '概览', question: '有什么值得发现' },
  { key: 'timeline', label: '时间轴', question: '事情是怎么展开的' },
  { key: 'explore', label: '探索', question: '它由什么组成' },
  { key: 'insights', label: '理解', question: '能从中看懂什么' },
]

/**
 * User Trajectory 的低保真原型。
 *
 * 一条主张贯穿四个视角：**这是一个信息空间，不是四个页面。**
 * 所以只有一份状态（`useTrajectoryStore`），选中、路径、集合、对比全部共用；
 * 只有两处刻意不共用（Explore 的类型过滤、Timeline 的线索过滤），用来验证
 * 「共享上下文 ≠ 同步所有 UI 状态」。
 */
export function UserTrajectoryView() {
  // 评审页专属：任何状态都能用一条链接指出来（截图要可复现，评审要能指哪看哪）。
  // ?view=overview|timeline|explore|insights · ?sel=<id> · ?panel=0 收起右栏
  const [params] = useSearchParams()
  const viewParam = params.get('view')
  const perspective =
    viewParam === 'timeline' || viewParam === 'explore' || viewParam === 'insights' ? viewParam : 'overview'
  const selParam = params.get('sel')
  const initialSelected = selParam && refOf(selParam) ? { id: selParam, type: refOf(selParam)!.type } : undefined
  const s = useTrajectoryStore({ perspective, selected: initialSelected })
  const [inspectorOpen, setInspectorOpen] = useState(params.get('panel') !== '0')

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="shrink-0 border-b border-border">
        <div className="flex items-baseline justify-between gap-4 px-6 pt-4 pb-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="text-[15px] tracking-tight text-foreground">陈知远</h1>
              <span className="text-[11px] text-muted-foreground">24 · 毕业后在家 · 长沙</span>
              <span className="border border-border px-1 text-[9px] text-muted-foreground">预览数据</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {SUMMARY.objects} 个对象 · {SUMMARY.events} 个事件 · {SUMMARY.evidence} 条证据 · {SUMMARY.interpretations} 条解释
            </p>
          </div>
          <div className="flex shrink-0 items-baseline gap-3 text-[11px]">
            <button type="button" onClick={() => s.setDrawer(true)} className="text-muted-foreground hover:text-foreground">
              集合 {s.collection.length}
            </button>
            <button
              type="button"
              onClick={() => s.setCompareOpen(true)}
              className={s.compare.length >= 2 ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
            >
              对比 {s.compare.length}
            </button>
            <button type="button" onClick={() => setInspectorOpen((v) => !v)} className="text-muted-foreground hover:text-foreground">
              {inspectorOpen ? '收起右栏' : '展开右栏'}
            </button>
          </div>
        </div>

        <nav className="flex items-baseline gap-1 px-6">
          {TABS.map((t) => {
            const active = s.perspective === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => s.switchPerspective(t.key)}
                title={t.question}
                className={`-mb-px border-b-2 px-2 py-1.5 text-[12px] ${
                  active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
                <span className="ml-1 hidden text-[10px] text-muted-foreground/70 md:inline">{t.question}</span>
              </button>
            )
          })}
        </nav>
      </header>

      <PathBar s={s} />

      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-border">
          {s.perspective === 'overview' ? <OverviewPerspective s={s} /> : null}
          {s.perspective === 'timeline' ? <TimelinePerspective s={s} /> : null}
          {s.perspective === 'explore' ? <ExplorePerspective s={s} /> : null}
          {s.perspective === 'insights' ? <InsightsPerspective s={s} /> : null}
        </main>
        {inspectorOpen && s.selected ? (
          <aside className="w-[320px] shrink-0 overflow-hidden">
            <Inspector s={s} />
          </aside>
        ) : null}
      </div>

      <ContextMenu s={s} />
      <CompareDialog s={s} />
      <CollectionDrawer s={s} />
    </div>
  )
}

/** 探索路径。它回答的是「我怎么走到这儿的」，所以只记走过的，不记所有可见的。 */
function PathBar({ s }: { s: ReturnType<typeof useTrajectoryStore> }) {
  if (s.path.length === 0 && !s.selected) {
    return (
      <div data-ut-path className="shrink-0 border-b border-border bg-muted/20 px-6 py-1 text-[10px] text-muted-foreground">
        还没选任何东西。点任意一行开始，路径会记在这一行。
      </div>
    )
  }
  return (
    <div data-ut-path className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-muted/20 px-6 py-1">
      <span className="mr-1 shrink-0 text-[9px] tracking-[0.16em] text-muted-foreground uppercase">路径</span>
      {s.path.length === 0 ? <span className="text-[10px] text-muted-foreground">只选中，还没走过</span> : null}
      {s.path.map((step, i) => (
        <span key={`${step.id}-${i}`} className="flex shrink-0 items-center gap-1">
          {i > 0 ? <span className="text-[10px] text-muted-foreground/50">›</span> : null}
          <button
            type="button"
            onClick={() => s.goTo(step)}
            className={`max-w-[220px] truncate text-[10px] hover:underline ${
              i === s.path.length - 1 ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {step.label}
          </button>
        </span>
      ))}
      <button type="button" onClick={s.clearPath} className="ml-2 shrink-0 text-[10px] text-muted-foreground hover:text-foreground">
        清空
      </button>
      <span className="ml-auto shrink-0 pl-3 text-[10px] text-muted-foreground/70">换视角时选中不丢，过滤会丢</span>
    </div>
  )
}
