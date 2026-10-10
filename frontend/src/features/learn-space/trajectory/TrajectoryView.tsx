import { useCallback, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  FileText,
  Flag,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Target,
} from 'lucide-react'

import { BoardCanvas, type Viewport } from '@/features/board/BoardCanvas'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { TRAJECTORY_SPACES } from './mockData'
import type {
  TrajectoryEvidence,
  TrajectoryKind,
  TrajectoryNode,
  TrajectorySpace,
} from './types'

/**
 * Trajectory —— Learn Space 的纵向时间层。
 *
 * ## 它在画布上，不在文档流里
 *
 * 这一版接了 `BoardCanvas`（拖动 + 以指针为锚点缩放）。这不是为了"看起来像个
 * 图"，而是因为**列表回答不了一个问题**："我走了多远"。长度能读，形状不能。
 *
 * ⚠️ **画布内的东西会跟着缩放** —— 缩到 0.25× 时节点上的字就读不到了。
 * 所以分工是：**画布里放紧凑的节点块**（时间、标题、类型标记），
 * **完整内容在 hover 时用 HTML 浮层给出**（不参与缩放），点击进 drawer 看依据。
 * 三层各自解决一件事：空间感、阅读、追溯。
 *
 * ## 纵向是时间，横向是「这个变化触及了什么」
 *
 * ⚠️ **这里没有画"依赖边"**，尽管它长得像科技树。科技树的语义是解锁
 * （"要学这个得先解锁那个"），而真实的 Trajectory 节点不互相解锁 ——
 * 9/26 那次突破不是 9/22 练习的解锁结果，是重讲之后的独立结果。
 * 画前置边等于编造用户没经历过的因果。横向那几列是 `relatedFocus`：
 * **同一个概念相关的节点落在同一列，于是"口语这件事我卡了三次"
 * 从三段需要你记住的文本，变成一条看得见的竖线。**
 */

const KIND_LABEL: Record<TrajectoryKind, string> = {
  breakthrough: '突破',
  problem: '反复出现',
  artifact: '产物',
  'goal-shift': '目标变化',
  'direction-shift': '方向转变',
  reflection: '回看',
  return: '回来',
  episode: '学习事件',
}

/** 只有三种「有分量」的类型值得一个文字标签；其余五种靠位置和标记形状分辨。 */
const KIND_LABELLED: TrajectoryKind[] = ['breakthrough', 'problem', 'artifact']

/* 与 GoalBlock 同源的三档按钮类 —— 这一页不该有自己的一套按钮。 */
const PRIMARY =
  'inline-flex h-7 items-center gap-1 rounded-full bg-foreground px-3 text-[12px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/20 disabled:opacity-40'
const QUIET =
  'inline-flex h-7 items-center gap-1 rounded-full px-2 text-[12px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/10 disabled:opacity-40'

/* ───────────────────────── 画布内的节点块 ───────────────────────── */

function Mark({ kind }: { kind: TrajectoryKind }) {
  if (kind === 'breakthrough') {
    return <span aria-hidden className="block size-3 shrink-0 rounded-full bg-zinc-900 ring-4 ring-white" />
  }
  if (kind === 'problem') {
    return <span aria-hidden className="block size-3 shrink-0 rotate-45 border border-zinc-900 bg-white" />
  }
  if (kind === 'artifact') {
    return <span aria-hidden className="block size-2.5 shrink-0 border border-zinc-900 bg-white" />
  }
  if (kind === 'goal-shift' || kind === 'direction-shift') {
    return <span aria-hidden className="block size-3 shrink-0 rounded-full border-2 border-zinc-900 bg-white" />
  }
  if (kind === 'return') {
    return <span aria-hidden className="block size-3 shrink-0 rounded-full border border-dashed border-zinc-400 bg-white" />
  }
  return <span aria-hidden className="block size-2 shrink-0 rounded-full border border-zinc-300 bg-white" />
}

/** 画布里的一个节点。紧凑 —— 因为它会被缩放，而缩放后的正文没人读得动。 */
function CanvasNode({
  node,
  top,
  left,
  focused,
  onHover,
  onOpen,
}: {
  node: TrajectoryNode
  /** 画布坐标。⚠️ 必须显式给 —— `absolute` 少了 top/left 就是全部叠在原点，
   *  而那不会报错，只会让所有节点看起来在同一处。 */
  top: number
  left: number
  focused: boolean
  onHover: (node: TrajectoryNode | null) => void
  onOpen: (node: TrajectoryNode) => void
}) {
  const labelled = KIND_LABELLED.includes(node.kind)
  return (
    <button
      type="button"
      style={{ top, left }}
      onMouseEnter={() => onHover(node)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(node)}
      onClick={() => onOpen(node)}
      className={`group absolute w-[268px] cursor-pointer rounded-xl border bg-white px-3.5 py-3 text-left transition-shadow ${
        focused
          ? 'border-zinc-400 shadow-[0_2px_12px_rgb(24_24_27/0.10)]'
          : 'border-zinc-200 hover:border-zinc-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <Mark kind={node.kind} />
        <span className="font-mono text-[11px] tracking-[0.1em] text-zinc-400 uppercase">
          {node.date}
        </span>
        {labelled && (
          <span className="rounded-full border border-zinc-200 px-1.5 py-px text-[10px] text-zinc-500">
            {KIND_LABEL[node.kind]}
          </span>
        )}
      </div>
      <p className="mt-1.5 font-serif text-[15px] leading-snug font-medium text-zinc-900">
        {node.title}
      </p>
      {node.relatedFocus && (
        <p className="mt-1 truncate font-mono text-[10.5px] text-zinc-400">
          {node.relatedFocus}
        </p>
      )}
      <p className="mt-1.5 font-mono text-[10.5px] text-zinc-400">
        {node.evidence.length > 0 ? `${node.evidence.length} 条依据` : '没有记录支撑'}
      </p>
    </button>
  )
}

/* ───────────────────────── hover 浮层（不参与缩放） ───────────────────────── */

/**
 * 节点的四问，浮在画布之上、**不跟着缩放**。
 *
 * 这是「可缩放」与「可读」两个要求的解法：画布负责空间感，浮层负责阅读。
 * 位置跟着鼠标，但仍受画布边界约束，不会飘出视口。
 */
function HoverCard({ node, x, y }: { node: TrajectoryNode; x: number; y: number }) {
  // 靠近右/下边缘时翻到另一侧，否则卡片会被视口切掉。
  const flipX = x > window.innerWidth - 400
  const flipY = y > window.innerHeight - 340
  return (
    <div
      className="pointer-events-none fixed z-40 w-[360px] rounded-xl border border-zinc-200 bg-white p-4 shadow-[0_8px_28px_rgb(24_24_27/0.12)]"
      style={{
        left: flipX ? x - 376 : x + 18,
        top: flipY ? y - 300 : y + 18,
      }}
    >
      <div className="flex items-center gap-2">
        <Mark kind={node.kind} />
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-zinc-400 uppercase">
          {node.date}
          {node.dateNote ? ` · ${node.dateNote}` : ''}
        </span>
      </div>
      <p className="mt-1.5 font-serif text-[16px] leading-snug font-medium text-zinc-900">
        {node.title}
      </p>
      <p className="mt-2 text-[13.5px] leading-6 text-zinc-600">{node.whatHappened}</p>

      <div className="mt-3 border-l-2 border-zinc-900/20 pl-3">
        <div className="font-mono text-[10px] tracking-[0.14em] text-zinc-400 uppercase">
          What changed
        </div>
        <p className="mt-0.5 text-[13.5px] leading-6 text-zinc-900">{node.whatChanged}</p>
      </div>

      <div className="mt-3">
        <div className="font-mono text-[10px] tracking-[0.14em] text-zinc-400 uppercase">
          What this changes
        </div>
        <p className="mt-0.5 text-[13.5px] leading-6 text-zinc-800">{node.implication}</p>
      </div>

      {node.whatRemains && (
        <p className="mt-3 flex items-start gap-1.5 text-[12.5px] leading-5 text-zinc-500">
          <Flag className="mt-0.5 size-3 shrink-0" aria-hidden />
          未解决：{node.whatRemains}
        </p>
      )}
      <p className="mt-3 font-mono text-[10.5px] text-zinc-400">
        点开看依据 →
      </p>
    </div>
  )
}

/* ───────────────────────── Evidence Drawer ───────────────────────── */

const SOURCE_ICON: Record<string, typeof FileText> = {
  artifact: FileText,
  conversation: MessageSquare,
  evidence: BookOpen,
  interaction: MessageSquare,
}

const SOURCE_LABEL: Record<string, string> = {
  artifact: '产物摘录',
  conversation: '原始对话',
  evidence: '记录',
  interaction: '原始交互',
}

function SourceExcerpt({ evidence }: { evidence: TrajectoryEvidence }) {
  const [open, setOpen] = useState(false)
  const Icon = SOURCE_ICON[evidence.sourceKind ?? 'evidence'] ?? FileText
  const label = SOURCE_LABEL[evidence.sourceKind ?? 'evidence']

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${QUIET} mt-1.5`}
      >
        <Icon className="size-3" aria-hidden />
        打开来源
        <ArrowRight className="size-3" aria-hidden />
      </button>
    )
  }
  return (
    <div className="mt-2 border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-zinc-400 uppercase">
        <Icon className="size-3" aria-hidden />
        {label}
      </div>
      <pre className="mt-1.5 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-zinc-800">
        {evidence.sourceExcerpt}
      </pre>
    </div>
  )
}

/**
 * 「凭什么这么判断」。
 *
 * 这一页存在的核心理由。**Trajectory 里的每一句语义判断都必须能被追到它的来源** ——
 * 否则它就是 AI 在编故事，而用户没有理由相信它。
 */
function EvidenceDrawer({
  open,
  onOpenChange,
  claim,
  items,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  claim: string
  items: TrajectoryEvidence[]
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l border-zinc-200 sm:max-w-xl">
        <SheetTitle className="font-serif text-lg font-medium">为什么这么判断</SheetTitle>
        <SheetDescription className="mt-3 text-sm leading-relaxed text-zinc-500">
          「{claim}」
        </SheetDescription>

        <div className="mt-8">
          <div className="font-mono text-[10.5px] tracking-[0.16em] text-zinc-400 uppercase">
            Evidence
          </div>
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              这一条没有记录支撑 —— 它是一个判断，还没有被证据接住。
            </p>
          ) : (
            <ul className="mt-4 space-y-5">
              {items.map((ev) => (
                <li key={ev.id} className="border-l border-zinc-200 pl-4">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-zinc-900">{ev.label}</span>
                    {typeof ev.count === 'number' && (
                      <span className="font-mono text-[11px] text-zinc-400">× {ev.count}</span>
                    )}
                    {ev.independent === true && (
                      <span className="rounded-full border border-zinc-200 px-1.5 py-px text-[10px] text-zinc-500">
                        独立
                      </span>
                    )}
                    {ev.independent === false && (
                      <span className="rounded-full border border-zinc-200 px-1.5 py-px text-[10px] text-zinc-500">
                        有提示
                      </span>
                    )}
                  </div>
                  {ev.detail && (
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600">{ev.detail}</p>
                  )}
                  {ev.sourceExcerpt && <SourceExcerpt evidence={ev} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ───────────────────────── Current State ───────────────────────── */

function CurrentState({
  space,
  viewport,
  onResetToNow,
}: {
  space: TrajectorySpace
  viewport: Viewport
  /** 回到现在。⚠️ 必须由外面传进来 —— 这个组件在模块级，
   *  它拿不到 TrajectoryView 里的 setResetKey，而 tsc 不会报那个错
   *  （见下面那条注释）。 */
  onResetToNow: () => void
}) {
  const zoom = Math.round(viewport.scale * 100)
  return (
    <header className="border-b border-zinc-200 pb-7">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-serif text-2xl leading-tight font-medium tracking-tight text-zinc-900">
          {space.name}
        </h1>
        <span className="font-mono text-[11px] tracking-widest text-zinc-400 uppercase">
          {space.domain}
        </span>
        <span className="font-mono text-[11px] text-zinc-400">{space.span}</span>
      </div>

      <p className="mt-4 max-w-2xl text-sm text-zinc-500">{space.current.goal}</p>

      <div className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-3">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.16em] text-zinc-400 uppercase">
            Currently
          </div>
          <dd className="mt-1.5 text-[15px] leading-relaxed text-zinc-900">
            {space.current.currently}
          </dd>
        </div>
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.16em] text-zinc-400 uppercase">
            Recent change
          </div>
          <dd className="mt-1.5 text-[15px] leading-relaxed text-zinc-900">
            {space.current.recentChange}
          </dd>
        </div>
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.16em] text-zinc-400 uppercase">
            What remains
          </div>
          <dd className="mt-1.5 text-[15px] leading-relaxed text-zinc-900">
            {space.current.whatRemains}
          </dd>
        </div>
      </div>

      {/* 缩放指示：缩到 0.25× 之后「我在哪」只能靠这个读出来 */}
      <div className="mt-6 flex items-center gap-2">
        <span className="font-mono text-[10.5px] tracking-[0.16em] text-zinc-400 uppercase">
          View
        </span>
        <span className="font-mono text-[12px] text-zinc-600">{zoom}%</span>
        <button
          type="button"
          onClick={onResetToNow}
          className={PRIMARY}
          title="回到起点（现在）"
        >
          <RefreshCw className="size-3" aria-hidden />
          回到现在
        </button>
      </div>
    </header>
  )
}

/* ───────────────────────── 页面 ───────────────────────── */

/** 画布上：最新在上，从原点往下 —— 所以「回到原点」就是「回到现在」。 */
const ROW_H = 132
const COL_W = 292
const COL_PAD = 24

export function TrajectoryView() {
  const [spaceId, setSpaceId] = useState(TRAJECTORY_SPACES[0].id)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 })
  const [hover, setHover] = useState<{ node: TrajectoryNode; x: number; y: number } | null>(null)
  const [drawer, setDrawer] = useState<{ claim: string; items: TrajectoryEvidence[] } | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const space = useMemo(
    () => TRAJECTORY_SPACES.find((s) => s.id === spaceId) ?? TRAJECTORY_SPACES[0],
    [spaceId]
  )

  /**
   * 横向分列：同一个 focus 永远落在同一列。
   *
   * ⚠️ 列位置必须**稳定** —— 否则同一件事在两次渲染里会跳到别的列，图就开始抖。
   * 所以 key 用 focus 名字本身，并按首次出现的顺序编号。
   */
  const columns = useMemo(() => {
    const order: string[] = []
    for (const node of space.nodes) {
      const f = node.relatedFocus
      if (f && !order.includes(f)) order.push(f)
    }
    return new Map(order.map((f, i) => [f, i]))
  }, [space.nodes])

  const ordered = useMemo(() => [...space.nodes].reverse(), [space.nodes])
  const onViewportChange = useCallback((v: Viewport) => setViewport(v), [])

  const trackMouse = useCallback((e: MouseEvent) => {
    setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h))
  }, [])

  return (
    <div className="min-h-screen bg-background" onMouseMove={trackMouse}>
      <div className="mx-auto max-w-4xl px-6 pt-10 sm:px-8">
        <nav aria-label="选择 Learn Space" className="mb-8 flex flex-wrap gap-2">
          {TRAJECTORY_SPACES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSpaceId(s.id)
                setResetKey((k) => k + 1)
              }}
              aria-current={s.id === space.id ? 'true' : undefined}
              className={`h-7 rounded-full px-3 text-[12px] transition-colors ${
                s.id === space.id
                  ? 'bg-foreground text-background'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              {s.name}
            </button>
          ))}
        </nav>

        <CurrentState
          space={space}
          viewport={viewport}
          onResetToNow={() => setResetKey((k) => k + 1)}
        />
      </div>

      {/*
        The canvas. `resetSignal` is the "back to now" mechanism, and it works
        because the origin IS the present: the newest node is drawn first, so
        resetting the viewport to `{0,0,1}` puts today back under the reader's
        eye. The alternative — a controlled viewport — would be the tidier API and
        the riskier change, since this component also hosts `/sandbox/board` and
        nothing there should move for a page that does not exist yet.
      */}
      <div className="relative mt-6 h-[560px] overflow-hidden border-y border-zinc-200">
        <BoardCanvas onViewportChange={onViewportChange} resetSignal={resetKey}>
          <div className="relative" style={{ width: COL_W * 3, height: ordered.length * ROW_H }}>
            {ordered.map((node, row) => {
              const col = node.relatedFocus ? (columns.get(node.relatedFocus) ?? 0) : 0
              return (
                <CanvasNode
                  key={node.id}
                  node={node}
                  top={row * ROW_H}
                  left={COL_PAD + col * COL_W}
                  focused={hover?.node.id === node.id}
                  onHover={(n) =>
                    setHover(
                      n
                        ? { node: n, x: window.innerWidth / 2, y: 120 }
                        : null
                    )
                  }
                  onOpen={(n) => setDrawer({ claim: n.whatChanged, items: n.evidence })}
                />
              )
            })}
            {/* Today 锚点：画布上的最后一行 */}
            <div
              className="absolute flex items-center gap-2"
              style={{ top: ordered.length * ROW_H, left: 0 }}
            >
              <span className="block size-3 rounded-full border-2 border-zinc-900 bg-white" />
              <span className="font-mono text-[11px] tracking-[0.2em] text-zinc-900 uppercase">
                Today
              </span>
            </div>
          </div>
        </BoardCanvas>

        {hover && <HoverCard node={hover.node} x={hover.x} y={hover.y} />}

        {/* 画布上的操作提示 —— 一次性的，不做成常驻控件 */}
        <div className="pointer-events-none absolute right-4 bottom-3 flex items-center gap-1.5 font-mono text-[10.5px] text-zinc-400">
          拖动平移 · Ctrl/⌘ + 滚轮缩放（或用右下角 ±）· 悬停看细节 · 点开看依据
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8 sm:px-8">
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-zinc-400">
          <Lightbulb className="mr-1.5 inline size-3" aria-hidden />
          这一页读到的是**已有的那几张表**（目标 · 记忆 · 学习状态 · 记录 · 产物 · 对话），
          不是另一套数据。当前是 mock。
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawer({ claim: space.current.recentChange, items: [] })}
            className={QUIET}
          >
            <Target className="size-3" aria-hidden />
            最近一次变化的依据
          </button>
          <span className="font-mono text-[11px] text-zinc-400">
            {space.nodes.length} 个节点 · {space.milestones.length} 个里程碑
          </span>
        </div>
      </div>

      <EvidenceDrawer
        open={drawer !== null}
        onOpenChange={(v) => {
          if (!v) setDrawer(null)
        }}
        claim={drawer?.claim ?? ''}
        items={drawer?.items ?? []}
      />
    </div>
  )
}

