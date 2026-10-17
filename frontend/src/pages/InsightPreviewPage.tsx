import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  FocusView,
  HAIR,
  INK,
  InsightMark,
  InsightPanel,
  MUTED,
  SpaceView,
  TrajectoryView,
} from '@/features/learn-space/insight/InsightViews'
import {
  PREVIEW_NOTE,
  SPACE,
  type UserAction,
  type View,
} from '@/features/learn-space/insight/insightPreviewData'

/**
 * 启示（Insight）的**免登录评审页** —— `/preview/insight`。
 *
 * ## 这一页想证明的一件事
 *
 * 启示不是一个独立的页面。它是**同一条观察**在三个地方的样子：
 * 空间里是一行安静的入口，聚焦里是一条贴在底部的带子，轨迹里是被引用那几行的左竖线。
 * 点开它，**右边那一栏不换** —— 你在三个视图之间走动时，观察本身一直停在原处。
 * 这就是"三个视图、一个东西"的形状。
 *
 * ## 三个刻意的克制
 *
 * 1. **它不是卡片**：左边一条细竖线 + 衬线体短句。卡片会把它变成"待处理的通 知"。
 * 2. **没有数字**：不出现百分比、不出现掌握度。只有"依据 4 条记录"和"确定性 中"。
 * 3. **可以不同意**：三个回应都是"我的看法"，其中两个是反驳。它不要求你接受。
 *
 * ⚠️ 数据全是假的（`insightPreviewData.ts`），页面上标了「预览数据」。
 * ⚠️ 这一页**不连后端、不写任何东西**：回应的状态只活在这个页面的 state 里。
 *
 * ## 查询参数（**只属于评审页，不是产品控件**）
 *
 * 任何状态都要能**用一条链接指出来** —— 否则评审时只能靠"点给我看"，截图也没法固定：
 * `?view=space|focus|trajectory` · `?panel=1`（把启示面板打开）· `?action=accepted|questioned|dismissed`
 * · `?dark=1`（切到暗色 —— 截图要能拍出"这一页在暗底下是不是一块亮斑"）
 * 例：`/preview/insight?view=trajectory&panel=1&action=questioned&dark=1`
 */
export function InsightPreviewPage() {
  const [params] = useSearchParams()
  const [view, setView] = useState<View>(() => {
    const raw = params.get('view')
    return raw === 'focus' || raw === 'trajectory' ? raw : 'space'
  })
  const [panelOpen, setPanelOpen] = useState(() => params.get('panel') === '1')
  const [action, setAction] = useState<UserAction>(() => {
    const raw = params.get('action')
    return raw === 'accepted' || raw === 'questioned' || raw === 'dismissed' ? raw : null
  })

  const dismissed = action === 'dismissed'
  const openInsight = () => setPanelOpen(true)

  /**
   * `?dark=1` —— 让暗色也能**用一条链接指出来**。
   *
   * 为什么需要：暗色是 `.dark` 类控制的（见 `index.css` 的 `@custom-variant`），
   * 而 headless 截图没法点主题开关。没有这个参数，"暗色下是不是一块亮斑"就只能靠嘴说。
   * ⚠️ 只属于评审页；离开时把类摘掉，别把状态漏给下一次渲染。
   */
  const dark = params.get('dark') === '1'
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    return () => document.documentElement.classList.remove('dark')
  }, [dark])
  const views: { key: View; label: string }[] = [
    { key: 'space', label: '空间' },
    { key: 'focus', label: '聚焦' },
    { key: 'trajectory', label: '轨迹' },
  ]

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--insight-paper)', color: INK }}>
      {/* ── 左栏：这个空间本身。它不该抢戏，但要走得出去。 ── */}
      <aside
        className="hidden w-[236px] shrink-0 flex-col border-r sm:flex"
        style={{ borderColor: HAIR }}
        aria-label="空间导航"
      >
        <div className="px-6 pt-7">
          <p className="font-serif text-[15px] leading-snug" style={{ color: INK }}>
            {SPACE.name}
          </p>
          <p className="mt-2 text-[11px] leading-5" style={{ color: MUTED }}>
            目标 · {SPACE.goal}
          </p>
        </div>

        <nav className="mt-9 px-3" aria-label="视图">
          {views.map((item) => {
            const active = item.key === view
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                aria-current={active ? 'page' : undefined}
                className="mb-0.5 flex w-full items-center gap-3 rounded-sm py-2 pl-3 text-left transition-colors hover:bg-black/[0.03]"
                style={{ color: active ? INK : MUTED }}
              >
                <span
                  aria-hidden
                  className="h-[13px] w-[2px] shrink-0 rounded-full"
                  style={{ backgroundColor: active ? INK : 'transparent' }}
                />
                <span className="text-[13px]">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto px-6 pb-6">
          <div className="pt-4" style={{ borderTop: `1px solid ${HAIR}` }} aria-label="启示入口">
            {dismissed ? (
              <div>
                <p className="text-[12px]" style={{ color: MUTED }}>
                  启示 · 已收起
                </p>
                <button
                  type="button"
                  onClick={() => setAction(null)}
                  className="mt-2 text-[12px] underline decoration-1 underline-offset-4 transition-opacity hover:opacity-60"
                  style={{ color: MUTED, textDecorationColor: HAIR }}
                >
                  还是看看吧
                </button>
              </div>
            ) : panelOpen ? null : (
              /* ⚠️ 面板开着时这里**不渲染**。
                 它不是"另一个入口"，它是同一件事的第二个说法 —— 而右边已经把它说全了。
                 三个视图各自再留一个入口，正是这一页冗余的源头。 */
              <button
                type="button"
                data-insight-entry="closed"
                onClick={openInsight}
                className="group block w-full text-left"
                aria-expanded={panelOpen}
              >
                <span className="flex items-center gap-2">
                  <InsightMark />
                  {/* ⚠️ 这里写「启示 · 1 条」，不写「有 1 条观察」。
                      后者和正文顶上那行「有一条观察，关于「特征值」」是**同一件事的两种说法**。
                      分工应该是：左栏是**导航**（报告状态：启示 · 1 条 / 启示 · 已收起），
                      正文那行是**内容**（说这条观察是关于什么的）。撞词就把分工抹掉了。 */}
                  <span className="text-[12px]" style={{ color: MUTED }}>
                    启示 · 1 条
                  </span>
                </span>
                {/* ⚠️ 这里原来还有「关于「特征值」」和日期 —— 那两行和右栏抬头**逐字相同**。
                    左栏是"这里有一条"，右栏才是"它是关于什么的"。点开就知道，不必先写在两处。 */}
              </button>
            )}
            <p className="mt-5 text-[11px] tracking-[0.04em]" style={{ color: 'var(--insight-leaf)' }}>
              {PREVIEW_NOTE}
            </p>
          </div>
        </div>
      </aside>

      {/* ── 主区：三个视图轮流住在这里。 ── */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {view === 'space' && (
          <SpaceView onOpenInsight={openInsight} dismissed={dismissed} insightOpen={panelOpen} />
        )}
        {view === 'focus' && (
          <FocusView onOpenInsight={openInsight} dismissed={dismissed} insightOpen={panelOpen} />
        )}
        {view === 'trajectory' && (
          <TrajectoryView onOpenInsight={openInsight} insightOpen={panelOpen} />
        )}
      </main>

      {/* ── 右栏：同一条观察。**换视图时它不动** —— 这正是"一个东西"的证据。 ── */}
      {panelOpen && (
        <aside
          data-insight-entry="open"
          className="w-[clamp(320px,34vw,430px)] shrink-0 overflow-hidden border-l"
          style={{ borderColor: HAIR, backgroundColor: 'var(--insight-panel)' }}
          aria-label="这条启示"
        >
          <InsightPanel action={action} onAction={setAction} onClose={() => setPanelOpen(false)} />
        </aside>
      )}
    </div>
  )
}
