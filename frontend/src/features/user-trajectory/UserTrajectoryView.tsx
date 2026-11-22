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
import { FLOAT, SHEET } from './kit'
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
 *
 * 视觉上只有两层：桌面（`bg-zinc-100 dark:bg-zinc-950`，同 AppLayout 外壳）与抬起来的面板（`bg-zinc-50`/`bg-white` + 极浅阴影）。
 */
export function UserTrajectoryView() {
  // 评审用：任何状态都能用一条链接指出来，截图可复现。
  // ?view=overview|timeline|explore|insights · ?sel=<id> · ?compare=1 · ?sheet=1 · ?save=a,b · ?theme=dark
  const [params] = useSearchParams()
  const viewParam = params.get('view')
  const perspective: Perspective =
    viewParam === 'timeline' || viewParam === 'explore' || viewParam === 'insights' ? viewParam : 'overview'
  const selParam = params.get('sel')
  const initialSelected = selParam && refOf(selParam) ? { id: selParam, type: refOf(selParam)!.type } : undefined
  const s = useTrajectoryStore({
    perspective,
    selected: initialSelected,
    comparing: params.get('compare') === '1',
    sheet: params.get('sheet') === '1',
    saved: (params.get('save') ?? '').split(',').filter(Boolean),
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (s.sheet) s.setSheet(false)
      else if (s.comparing) s.setComparing(false)
      else if (s.selected) s.closeDetail()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s])

  const detail = s.selected && !s.comparing

  return (
    // `dark` 类必须挂在**没有颜色类**的外层：`@custom-variant dark` 是 `.dark *`，
    // 挂在同一个元素上时它自己的 dark:bg 不生效（v4 第一次截暗色才发现）。
    <div className={params.get('theme') === 'dark' ? 'dark' : ''}>
      <div className="flex h-screen flex-col bg-zinc-100 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 antialiased">
      <header className="relative z-20 flex h-[54px] shrink-0 items-stretch gap-9 px-12">
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="text-[14px] tracking-[-0.01em]">陈知远</span>
          <span className="mt-px text-[9.5px] tracking-[0.16em] text-zinc-400 dark:text-zinc-500">2026 — 27</span>
          <span className="ml-1 border border-zinc-200 dark:border-zinc-800 px-1 py-px text-[8.5px] leading-[11px] tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
            合成
          </span>
        </div>

        <nav className="flex shrink-0 items-stretch gap-7">
          {TABS.map((t) => {
            const active = s.perspective === t.key && !s.comparing
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => s.switchPerspective(t.key)}
                title={t.question}
                className="group relative flex items-center text-[12px]"
              >
                <span
                  className={
                    active
                      ? 'tracking-[0.02em] text-zinc-950 dark:text-zinc-50'
                      : 'tracking-[0.02em] text-zinc-400 dark:text-zinc-500 transition-colors group-hover:text-zinc-950 dark:group-hover:text-zinc-50'
                  }
                >
                  {t.label}
                </span>
                {active ? <span className="absolute inset-x-0 -bottom-px h-[2px] bg-zinc-900 dark:bg-zinc-50" /> : null}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-4">
          <span className="w-[168px] text-right text-[10px] text-zinc-600 dark:text-zinc-300">{s.flash ?? ''}</span>
          <button
            type="button"
            onClick={() => s.setSheet(true)}
            className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
          >
            暂存
            {s.collection.length > 0 ? (
              <span className="text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">{String(s.collection.length).padStart(2, '0')}</span>
            ) : null}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3">
        <main className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${SHEET}`}>
          {s.comparing ? <CompareView s={s} /> : null}
          {!s.comparing && s.perspective === 'overview' ? <OverviewPerspective s={s} /> : null}
          {!s.comparing && s.perspective === 'timeline' ? <TimelinePerspective s={s} /> : null}
          {!s.comparing && s.perspective === 'explore' ? <ExplorePerspective s={s} /> : null}
          {!s.comparing && s.perspective === 'insights' ? <InsightsPerspective s={s} /> : null}
        </main>
        {detail ? (
          <aside className={`relative z-10 w-[360px] shrink-0 animate-in slide-in-from-right-2 duration-150 ${FLOAT}`}>
            <DetailPanel s={s} />
          </aside>
        ) : null}
      </div>

      <CollectionSheet s={s} />
      </div>
    </div>
  )
}
