import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

import { InsightPanel } from '@/features/learn-space/insight/InsightViews'
import type { UserAction } from '@/features/learn-space/insight/insightPreviewData'
import { INITIAL_ELEMENTS, FILE_CONTENT, type CanvasElement } from '@/features/space-canvas/canvasData'
import { PrototypeCanvas } from '@/features/space-canvas/PrototypeCanvas'

/**
 * Learn Space 画布原型的评审入口 —— `/preview/space-canvas`，免登录、全 mock。
 *
 * 这一屏验三件事：
 * 1. **画布是主区**：三类元素各自成形态，拖得动，画布吃掉除 Insight 栏外的全部宽度；
 * 2. **Insight 持续可见**：右侧固定栏，收起后留一条窄条 —— 不整栏消失（D1）；
 * 3. **画布 ↔ 聚焦**：双击 file 进入同一页内的聚焦态，返回后画布**原样**。
 *
 * ## 一个要提前说清的实现选择
 *
 * 「返回后画布原样」不能靠路由回退白拿 —— React Router 下每次切换是重新挂载。
 * 所以画布状态（元素位置、note 文本、insight 开合）存在 **sessionStorage**：
 * 关标签页就没了，但在一次评审会话里，切走再回来是完整的。
 * 这是 **prototype-only** 的做法；转正时换成真正的持久化，并重审"画布态要不要落库"。
 *
 * ## 聚焦态是同页的，不走路由
 *
 * 计划 §8 的取舍：状态保留在同页 state 下是免费的；跳到独立路由就要把"返回时还原"
 * 做成跨页面协议。原型先验交互流，路由级跳转留给转正讨论。
 */
const STORAGE_KEY = 'space-canvas-prototype-elements'

function loadElements(): CanvasElement[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as CanvasElement[]
  } catch {
    /* sessionStorage 不可用（隐私模式等）就回到初始排布 —— 原型可以接受。 */
  }
  return INITIAL_ELEMENTS
}

export function SpaceCanvasPreviewPage() {
  const [elements, setElements] = useState<CanvasElement[]>(loadElements)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [insightOpen, setInsightOpen] = useState(true)
  const [insightAction, setInsightAction] = useState<UserAction>(null)
  const [focusFile, setFocusFile] = useState<string | null>(null)

  /* 画布态的唯一持久化。位置、note 文本都在 elements 里，一次写完。 */
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(elements))
    } catch {
      /* 同上 */
    }
  }, [elements])

  const changeElement = (id: string, patch: Partial<CanvasElement>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)))
  }

  const openFile = (element: CanvasElement) => setFocusFile(element.title)
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-100 text-zinc-900">
      {focusFile ? (
        <FocusHeader file={focusFile} onBack={() => setFocusFile(null)} />
      ) : (
        <CanvasHeader
          elementCount={elements.length}
          insightOpen={insightOpen}
          onToggleInsight={() => setInsightOpen((v) => !v)}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {/* 画布与聚焦态**并存渲染、用 hidden 切换** —— 不是条件卸载。
            否则切到聚焦再回来，滑杆角度、note 的编辑态全被卸载洗掉，
            「返回后画布原样」就要靠一路 state 提升，成本远大于一个 hidden。 */}
        <div className={cn('relative min-w-0 flex-1', focusFile && 'hidden')}>
          <PrototypeCanvas
            elements={elements}
            zoom={100}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onElementChange={changeElement}
            onOpenFile={openFile}
          />
        </div>
        {focusFile ? (
          <div className="min-w-0 flex-1 overflow-y-auto">
            <FocusPane file={focusFile} />
          </div>
        ) : null}

        {/* Insight 栏：开着是 300px 的面板，收起是一条 32px 窄条。
            两个态都保持挂载（onAction 的选择不丢）。 */}
        <div
          className={cn(
            'shrink-0 overflow-hidden bg-white transition-[width] duration-200',
            insightOpen ? 'w-[300px] border-l border-zinc-200/70' : 'w-8 border-l border-zinc-200/70'
          )}
        >
          {insightOpen ? (
            <InsightPanel
              action={insightAction}
              onAction={setInsightAction}
              onClose={() => setInsightOpen(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setInsightOpen(true)}
              aria-label="展开启示"
              className="flex h-full w-full flex-col items-center gap-3 pt-4"
            >
              <span className="size-1.5 rounded-full" style={{ background: 'var(--insight-accent)' }} />
              <span
                className="text-[11px] tracking-[0.14em] text-zinc-400 [writing-mode:vertical-rl]"
              >
                启示
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── 顶栏的两个态 ─────────────────────────────────────────────────────── */

function CanvasHeader({
  elementCount,
  insightOpen,
  onToggleInsight,
}: {
  elementCount: number
  insightOpen: boolean
  onToggleInsight: () => void
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200/70 bg-white px-5">
      <h1 className="text-[15px] font-medium text-zinc-900">特征向量 · 学习空间</h1>
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">
        画布 · {elementCount} 个元素
      </span>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-[11px] text-zinc-400 sm:inline">Proposal C · 原型</span>
        <button
          type="button"
          onClick={onToggleInsight}
          aria-expanded={insightOpen}
          title={insightOpen ? '收起启示' : '展开启示'}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] transition-colors',
            insightOpen ? 'bg-zinc-100 text-zinc-700' : 'text-zinc-400 hover:bg-zinc-50'
          )}
        >
          启示
        </button>
      </div>
    </header>
  )
}

function FocusHeader({ file, onBack }: { file: string; onBack: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200/70 bg-white px-5">
      <button
        type="button"
        onClick={onBack}
        className="rounded-md px-2 py-1.5 text-[12px] text-zinc-600 transition-colors hover:bg-zinc-100"
      >
        ← 返回画布
      </button>
      <span className="text-zinc-300">/</span>
      <h1 className="text-[15px] font-medium text-zinc-900">{file}</h1>
      <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">
        聚焦
      </span>
    </header>
  )
}

/* ── 聚焦态的中栏（最简：对应文件的正文）────────────────────────────── */

function FocusPane({ file }: { file: string }) {
  const lines = FILE_CONTENT[file] ?? ['（这份文件还没有可显示的正文。）']
  return (
    <article className="mx-auto max-w-[44rem] px-8 py-10">
      {lines.map((line, i) => (
        <p
          key={i}
          className={cn('text-[15px] leading-8', i === 0 ? 'font-medium text-zinc-900' : 'mt-3 text-zinc-700')}
        >
          {line}
        </p>
      ))}
      <p className="mt-8 text-[12px] text-zinc-400">
        来源：画布中的「{file}」 · 返回后画布会保持原样（位置、便签、启示的开合）。
      </p>
    </article>
  )
}
