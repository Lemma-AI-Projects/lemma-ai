import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  FileText,
  Flag,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Target,
} from 'lucide-react'

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
 * ## 它是什么，不是什么
 *
 * 记录**一个 Space 随着用户持续行动而发生的变化**。所以它的最小单位不是
 * 「一次活动」，而是**一次有意义的改变** —— 而一次改变只有在四个问题都有答案时
 * 才值得占一行：发生了什么 · 什么变了 · 凭什么这么判断 · 这对接下来的意义是什么。
 *
 * 少了第四个，它就是日志；少了第三个，它就是 AI 在编故事。这两条是这一页的设计约束，
 * 而 `EvidenceDrawer` 存在的全部理由就是第三条。
 *
 * ## 与现有架构的关系
 *
 * 本页**不创建任何新的语义来源**。未来每条 node 的数据会来自已有的那几张表
 * （Goal / Space Memory / Learner State / Evidence / Artifact / Conversation），
 * 按时间维度组织起来。所以 `types.ts` 里的字段名刻意贴着那些既有概念的用词 ——
 * 将来换的是 mock 文件，不是组件。
 *
 * ## 视觉基调
 *
 * quiet / precise / spatial / reflective —— 一份研究笔记，不是一个 dashboard。
 * 所以：不用进度百分比、不用 streak、不用彩色标签墙；节点类型靠**形状与位置**区分，
 * 而不是靠颜色；唯一的强调色留给「判断」和「它的依据」。
 */

const KIND_LABEL: Record<TrajectoryKind, string> = {
  episode: '学习事件',
  breakthrough: '突破',
  problem: '反复出现的困难',
  artifact: '产物',
  'goal-shift': '目标变化',
  'direction-shift': '方向转变',
  reflection: '回看',
  return: '回来',
}

/**
 * 节点类型的视觉差异 —— 靠**标记形状**而不是颜色。
 *
 * 八个类型要能被区分，但不能变成一排彩色标签。所以：只有三种「有分量」的
 * （突破 / 困难 / 产物）用实心标记，其余用细环；文字标签只给三种有分量的类型，
 * 因为其余五种之间的差别**在版式上已经能看出来**（一个是开放节点、一个是作品、
 * 一个是转向）。
 */
const KIND_MARK: Record<TrajectoryKind, string> = {
  breakthrough: 'filled',
  problem: 'diamond',
  artifact: 'square',
  'goal-shift': 'ring-thick',
  'direction-shift': 'ring-thick',
  reflection: 'ring',
  return: 'ring-dashed',
  episode: 'ring',
}

const KIND_WEIGHT: Record<TrajectoryKind, string> = {
  breakthrough: 'font-medium text-foreground',
  problem: 'text-foreground',
  artifact: 'text-foreground',
  'goal-shift': 'text-foreground',
  'direction-shift': 'text-foreground',
  reflection: 'text-muted-foreground',
  return: 'text-muted-foreground',
  episode: 'text-muted-foreground',
}

function Mark({ kind }: { kind: TrajectoryKind }) {
  const shape = KIND_MARK[kind]
  if (shape === 'filled') {
    return (
      <span
        aria-hidden
        className="mt-[5px] block size-2.5 shrink-0 rounded-full bg-foreground ring-4 ring-background"
      />
    )
  }
  if (shape === 'diamond') {
    return (
      <span
        aria-hidden
        className="mt-[3px] block size-3 shrink-0 rotate-45 border border-foreground bg-background"
      />
    )
  }
  if (shape === 'square') {
    return (
      <span
        aria-hidden
        className="mt-[3px] block size-2.5 shrink-0 border border-foreground bg-background"
      />
    )
  }
  if (shape === 'ring-thick') {
    return (
      <span
        aria-hidden
        className="mt-[3px] block size-3 shrink-0 rounded-full border-2 border-foreground bg-background"
      />
    )
  }
  if (shape === 'ring-dashed') {
    return (
      <span
        aria-hidden
        className="mt-[3px] block size-3 shrink-0 rounded-full border border-dashed border-muted-foreground bg-background"
      />
    )
  }
  return (
    <span
      aria-hidden
      className="mt-[4px] block size-2 shrink-0 rounded-full border border-muted-foreground/60 bg-background"
    />
  )
}

/* ───────────────────────── 顶部：Current State ───────────────────────── */

/**
 * 顶部刻意很克制 —— 三句话 + 一个跨度，**没有任何 KPI**。
 *
 * 因为用户打开这一页的第一个问题不是"我学了多少"，是"我现在在哪"。
 * 而 KPI 会把注意力引到"数字好不好看"上，那正是这个页面要避免的东西。
 */
function CurrentState({ space }: { space: TrajectorySpace }) {
  return (
    <header className="border-b border-border pb-8">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-serif text-2xl leading-tight font-medium tracking-tight text-foreground">
          {space.name}
        </h1>
        <span className="font-mono-cjk text-[11px] tracking-widest text-muted-foreground uppercase">
          {space.domain}
        </span>
        <span className="font-mono-cjk text-[11px] text-muted-foreground/70">{space.current.span}</span>
      </div>

      <p className="mt-5 max-w-2xl text-sm text-muted-foreground">{space.current.goal}</p>

      <dl className="mt-7 grid gap-x-10 gap-y-5 sm:grid-cols-2">
        <div>
          <dt className="font-mono-cjk text-[10.5px] tracking-[0.16em] text-muted-foreground/70 uppercase">
            Currently
          </dt>
          <dd className="mt-1.5 text-[15px] leading-relaxed text-foreground">
            {space.current.currently}
          </dd>
        </div>
        <div>
          <dt className="font-mono-cjk text-[10.5px] tracking-[0.16em] text-muted-foreground/70 uppercase">
            Recent change
          </dt>
          <dd className="mt-1.5 text-[15px] leading-relaxed text-foreground">
            {space.current.recentChange}
          </dd>
        </div>
      </dl>

      <Overview space={space} />
    </header>
  )
}

/**
 * 时间跨度上的一行关键节点。
 *
 * ⚠️ **它不是进度条。** 所以：没有填充、没有百分比、没有完成态 ——
 * 只有位置和一个空心点。当前位置用一条竖线标出，而不是"你已经走了 70%"。
 */
function Overview({ space }: { space: TrajectorySpace }) {
  const { overviewMarks, span } = space.current
  return (
    <div className="mt-8">
      <div className="font-mono-cjk text-[10.5px] tracking-[0.16em] text-muted-foreground/70 uppercase">
        Trajectory
      </div>
      <div className="relative mt-3 h-9">
        {/* 基线：一条极淡的横线，代表时间本身 */}
        <div className="absolute inset-x-0 top-[7px] h-px bg-border" aria-hidden />
        {overviewMarks.map((m) => {
          const isNow = m.at >= 1
          // ⚠️ 两端用 `left-0` / `right-0`，中间才居中。
          // `left:100%` 的 absolute 元素**可用宽度是 0**（父容器右边界就在那儿），
          // 于是标签被压成竖排 —— 一列一个字，在真截图里非常明显。
          // 改成 `right-0` 让它从右边界往左伸展，宽度由内容决定。
          const atStart = m.at <= 0
          const atEnd = m.at >= 1
          return (
            <div
              key={m.id}
              className={`absolute top-0 flex flex-col ${
                atStart
                  ? 'left-0 items-start'
                  : atEnd
                    ? 'right-0 items-end'
                    : '-translate-x-1/2 items-center'
              }`}
              style={atStart || atEnd ? undefined : { left: `${m.at * 100}%` }}
            >
              <span
                aria-hidden
                className={
                  isNow
                    ? 'mt-[3px] block size-2.5 rounded-full border-2 border-foreground bg-background'
                    : m.kind === 'breakthrough'
                      ? 'mt-[4px] block size-2 rounded-full bg-foreground'
                      : 'mt-[4.5px] block size-1.5 rounded-full border border-muted-foreground/60 bg-background'
                }
              />
              <span
                className={`mt-1.5 font-mono-cjk text-[10px] leading-tight whitespace-nowrap text-muted-foreground/70 ${
                  atEnd ? 'text-right' : ''
                }`}
              >
                {m.label}
              </span>
            </div>
          )
        })}
      </div>
      {/*
        ⚠️ 这一行**只留起点**，而且它与顶部标题旁的 `span` 也不重复 ——
        顶部给的是完整的 `Sep 3 – Oct 2 · 8 周`，这里给的是"这条线从哪开始"。
        之前这里左右各写一个（右边写「现在」），结果在真截图里「现在」与下面的
        「8 周」上下紧挨着，看起来像同一个词被压成竖排 —— 那是两个不同层级的信息
        撞在一起，不是渲染 bug，但读起来会误判。
      */}
      <div className="font-mono-cjk text-[10px] text-muted-foreground/50">
        {span.split(' · ')[0]}
      </div>
    </div>
  )
}

/* ───────────────────────── Evidence Drawer ───────────────────────── */

/**
 * 「凭什么这么判断」的展开面板。
 *
 * 这一页最重要的交互。**Trajectory 里的每一句语义判断都必须能被追到它的来源** ——
 * 否则它就是 AI 在编故事，而用户没有理由相信它。所以每条 evidence 都能再点开一层，
 * 显示它指向的原始对象（一次交互 / 一份产物摘录 / 一条记录）。
 *
 * 视觉上刻意做成「档案」而不是「详情」：文件名 + 一段摘录 + 出处类型，
 * 像翻一份原始材料，而不是在看一个调试面板。
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
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetTitle className="font-serif text-lg font-medium">
          为什么这么判断
        </SheetTitle>
        <SheetDescription className="mt-3 text-sm leading-relaxed text-muted-foreground">
          「{claim}」
        </SheetDescription>

        <div className="mt-8">
          <div className="font-mono-cjk text-[10.5px] tracking-[0.16em] text-muted-foreground/70 uppercase">
            Evidence
          </div>

          {items.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              这一条没有记录支撑 —— 它是一个判断，还没有被证据接住。
            </p>
          ) : (
            <ul className="mt-4 space-y-5">
              {items.map((ev) => (
                <li key={ev.id} className="border-l border-border pl-4">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-foreground">{ev.label}</span>
                    {typeof ev.count === 'number' && (
                      <span className="font-mono-cjk text-[11px] text-muted-foreground/70">
                        × {ev.count}
                      </span>
                    )}
                    {ev.independent === true && (
                      <span className="font-mono-cjk text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                        独立
                      </span>
                    )}
                    {ev.independent === false && (
                      <span className="font-mono-cjk text-[10px] tracking-wider text-muted-foreground/50 uppercase">
                        有提示
                      </span>
                    )}
                  </div>
                  {ev.detail && (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {ev.detail}
                    </p>
                  )}
                  {ev.sourceExcerpt && (
                    <SourceExcerpt evidence={ev} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

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

/** 一次「再点一层」—— 从证据追到它指向的那个东西。 */
function SourceExcerpt({ evidence }: { evidence: TrajectoryEvidence }) {
  const [open, setOpen] = useState(false)
  const Icon = SOURCE_ICON[evidence.sourceKind ?? 'evidence'] ?? FileText
  const label = SOURCE_LABEL[evidence.sourceKind ?? 'evidence']

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 font-mono-cjk text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground"
      >
        <Icon className="size-3" aria-hidden />
        打开来源
        <ArrowRight className="size-3" aria-hidden />
      </button>
    )
  }

  return (
    <div className="mt-2 border border-border bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 font-mono-cjk text-[10px] tracking-[0.14em] text-muted-foreground/60 uppercase">
        <Icon className="size-3" aria-hidden />
        {label}
      </div>
      <pre className="mt-2 font-mono-cjk text-[12px] leading-relaxed whitespace-pre-wrap text-foreground/80">
        {evidence.sourceExcerpt}
      </pre>
    </div>
  )
}

/* ───────────────────────── 时间线节点 ───────────────────────── */

function NodeCard({
  node,
  onAskEvidence,
}: {
  node: TrajectoryNode
  onAskEvidence: (node: TrajectoryNode) => void
}) {
  const [open, setOpen] = useState(false)
  const isHeavy = node.kind === 'breakthrough' || node.kind === 'problem' || node.kind === 'artifact'
  const hasEvidence = node.evidence.length > 0

  return (
    <article className="relative pl-8">
      {/* 时间线主干：只画到最后一个节点之前，最后一段交给 Today 锚点 */}
      <span
        aria-hidden
        className="absolute top-0 bottom-0 left-[5px] w-px bg-foreground/20"
      />
      <div className="relative -ml-8 flex items-start pb-1">
        <span className="absolute top-4 left-0 flex size-[11px] items-center justify-center">
          <Mark kind={node.kind} />
        </span>
      </div>

      <div className="pb-10">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono-cjk text-[11px] tracking-[0.12em] text-muted-foreground/70 uppercase">
            {node.date}
          </span>
          {node.dateNote && (
            <span className="text-[11px] text-muted-foreground/50">{node.dateNote}</span>
          )}
          {isHeavy && (
            <span className="font-mono-cjk text-[10px] tracking-[0.14em] text-muted-foreground/60 uppercase">
              {KIND_LABEL[node.kind]}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="group mt-2 block w-full text-left"
        >
          <h3
            className={`font-serif text-[19px] leading-snug tracking-tight ${
              KIND_WEIGHT[node.kind]
            } group-hover:underline group-hover:decoration-border group-hover:underline-offset-4`}
          >
            {node.title}
          </h3>
        </button>

        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-foreground/85">
          {node.whatHappened}
        </p>

        {/* 变化：这一条为什么值得占一行 */}
        <div className="mt-4 border-l-2 border-foreground/25 pl-3.5">
          <div className="font-mono-cjk text-[10.5px] tracking-[0.16em] text-muted-foreground/70 uppercase">
            What changed
          </div>
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-foreground">
            {node.whatChanged}
          </p>
        </div>

        {/* Implication：整个页面最重要的一项，所以给它最安静但最实的排版 */}
        <div className="mt-4 max-w-2xl">
          <div className="font-mono-cjk text-[10.5px] tracking-[0.16em] text-muted-foreground/70 uppercase">
            What this changes
          </div>
          <p className="mt-1 text-[15px] leading-relaxed text-foreground/90">{node.implication}</p>
        </div>

        {/* 依据：永远可见（不是藏在展开里），因为它是可信度的来源 */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => onAskEvidence(node)}
            disabled={!hasEvidence}
            className="inline-flex items-center gap-1.5 font-mono-cjk text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Lightbulb className="size-3" aria-hidden />
            {hasEvidence
              ? `${node.evidence.length} 条依据`
              : '没有记录支撑'}
            <ArrowRight className="size-3" aria-hidden />
          </button>

          {node.relatedArtifact && (
            <span className="inline-flex items-center gap-1.5 font-mono-cjk text-[11px] text-muted-foreground/70">
              <FileText className="size-3" aria-hidden />
              {node.relatedArtifact.name}
            </span>
          )}
          {node.relatedFocus && (
            <span className="inline-flex items-center gap-1.5 font-mono-cjk text-[11px] text-muted-foreground/70">
              <Target className="size-3" aria-hidden />
              {node.relatedFocus}
            </span>
          )}

          {node.whatRemains && (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Flag className="size-3" aria-hidden />
              未解决：{node.whatRemains}
            </span>
          )}
        </div>

        {open && (
          <div className="mt-4 border-l border-border pl-4">
            <div className="font-mono-cjk text-[10.5px] tracking-[0.16em] text-muted-foreground/70 uppercase">
              Evidence
            </div>
            <ul className="mt-2 space-y-2.5">
              {node.evidence.map((ev) => (
                <li key={ev.id} className="text-[14px] text-foreground/85">
                  <span className="text-foreground">{ev.label}</span>
                  {ev.detail && <span className="text-muted-foreground"> — {ev.detail}</span>}
                  {typeof ev.count === 'number' && (
                    <span className="font-mono-cjk text-[11px] text-muted-foreground/70">
                      {' '}
                      × {ev.count}
                    </span>
                  )}
                </li>
              ))}
              {node.evidence.length === 0 && (
                <li className="text-[14px] text-muted-foreground">
                  这一条还没有记录支撑。它是一个判断。
                </li>
              )}
            </ul>
            {node.relatedArtifact?.excerpt && (
              <>
                <div className="mt-5 font-mono-cjk text-[10.5px] tracking-[0.16em] text-muted-foreground/70 uppercase">
                  Related artifact
                </div>
                <blockquote className="mt-1.5 border-l border-border pl-3 font-serif text-[14px] leading-relaxed text-foreground/80 italic">
                  {node.relatedArtifact.excerpt}
                </blockquote>
              </>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 font-mono-cjk text-[11px] text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          <ChevronDown
            className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
          {open ? '收起' : '展开'}
        </button>
      </div>
    </article>
  )
}

/* ───────────────────────── Period / Milestone ───────────────────────── */

/** 一段连续的学习阶段 —— 介于单个事件与里程碑之间的尺度。 */
function PeriodBlock({
  title,
  dateRange,
  summary,
  count,
}: {
  title: string
  dateRange: string
  summary: string
  count: number
}) {
  return (
    <div className="relative py-5 pl-8">
      <span aria-hidden className="absolute top-0 bottom-0 left-[5px] w-px bg-foreground/20" />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-serif text-[15px] font-medium tracking-tight text-foreground/90">
          {title}
        </h3>
        <span className="font-mono-cjk text-[11px] text-muted-foreground/70">{dateRange}</span>
        <span className="font-mono-cjk text-[10.5px] text-muted-foreground/50">
          {count} 个事件
        </span>
      </div>
      <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
        {summary}
      </p>
    </div>
  )
}

/** 跨越一个阶段的变化 —— 第三个时间尺度，也是时间线上唯一"竖出来"的东西。 */
function MilestoneBlock({
  title,
  date,
  because,
}: {
  title: string
  date: string
  because: string
}) {
  return (
    <div className="relative py-7 pl-8">
      <span aria-hidden className="absolute top-0 bottom-0 left-[5px] w-px bg-foreground/20" />
      <div className="relative -ml-8 mb-3 flex items-center gap-2.5">
        <span
          aria-hidden
          className="mt-0.5 block size-2.5 shrink-0 rounded-full bg-foreground ring-4 ring-background"
        />
        <span className="font-mono-cjk text-[10.5px] tracking-[0.16em] text-muted-foreground/70 uppercase">
          Milestone
        </span>
        <span className="font-mono-cjk text-[11px] text-muted-foreground/60">{date}</span>
      </div>
      <h3 className="font-serif text-[21px] leading-snug font-medium tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{because}</p>
    </div>
  )
}

/* ───────────────────────── Today 锚点 ───────────────────────── */

/**
 * 「你现在在哪」—— 用户不该在历史里迷路。
 *
 * 所以时间线的末端不是"结束"，而是一个明确的现在：此刻在做什么、刚刚变了什么、
 * 还有什么没解决。Past ↓ Current 这个方向由它收口。
 */
function TodayAnchor({ space }: { space: TrajectorySpace }) {
  return (
    <div className="relative pt-8 pb-2 pl-8">
      <span aria-hidden className="absolute top-0 bottom-0 left-[5px] w-px bg-foreground/20" />
      <div className="relative -ml-8 mb-4 flex items-center gap-2.5">
        <span
          aria-hidden
          className="block size-3 shrink-0 rounded-full border-2 border-foreground bg-background"
        />
        <span className="font-mono-cjk text-[10.5px] tracking-[0.2em] text-foreground uppercase">
          Today
        </span>
      </div>

      <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
        <div>
          <div className="font-mono-cjk text-[10.5px] tracking-[0.16em] text-muted-foreground/70 uppercase">
            Current state
          </div>
          <p className="mt-1.5 text-[15px] leading-relaxed text-foreground">
            {space.current.currently}
          </p>
        </div>
        <div>
          <div className="font-mono-cjk text-[10.5px] tracking-[0.16em] text-muted-foreground/70 uppercase">
            What remains
          </div>
          <p className="mt-1.5 text-[15px] leading-relaxed text-foreground">
            {space.current.whatRemains}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mt-6 inline-flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono-cjk text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
      >
        <MessageSquare className="size-3" aria-hidden />
        问 Agent 关于这段轨迹
      </button>
    </div>
  )
}

/* ───────────────────────── 页面 ───────────────────────── */

/**
 * @param defaultSpaceId 初始选中的空间。路由不传（用第一个），
 *   离屏 harness 传 —— 这样"产物驱动的那条轨迹"能被单独断言，
 *   而不用在页面里加一个只为测试存在的开关。
 * @param spaceOverride 整个空间对象的替换。**只为离屏 harness 的"无依据"态存在**，
 *   那个状态在真实数据里会出现（用户做了一件事但没有记录），
 *   而它必须在页面上被看到。
 */
export function TrajectoryView({
  defaultSpaceId,
  spaceOverride,
}: {
  defaultSpaceId?: string
  spaceOverride?: TrajectorySpace
} = {}) {
  const [spaceId, setSpaceId] = useState(defaultSpaceId ?? TRAJECTORY_SPACES[0].id)
  const [drawer, setDrawer] = useState<{ claim: string; items: TrajectoryEvidence[] } | null>(
    null
  )

  const space = useMemo(
    () =>
      spaceOverride ??
      TRAJECTORY_SPACES.find((s) => s.id === spaceId) ??
      TRAJECTORY_SPACES[0],
    [spaceId, spaceOverride]
  )

  // 时间线：倒序（新的在上）—— 因为这一页的读者通常是"先看最近发生了什么"。
  // 未来的真实数据里这一点会由用户自己选，但默认倒序更符合"打开就想知道最新"的动作。
  const ordered = useMemo(() => [...space.nodes].reverse(), [space.nodes])

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-14 sm:px-8">
        {/* 空间切换：三个刻意不同的学习过程，用来验证 Trajectory 能不能表达不同的走法 */}
        <nav aria-label="选择 Learn Space" className="mb-10 flex flex-wrap gap-2">
          {TRAJECTORY_SPACES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSpaceId(s.id)}
              aria-current={s.id === space.id ? 'true' : undefined}
              className={`border px-3 py-1.5 font-mono-cjk text-[11.5px] transition-colors ${
                s.id === space.id
                  ? 'border-foreground/40 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.name}
            </button>
          ))}
        </nav>

        <CurrentState space={space} />

        <section className="pt-12" aria-label="Trajectory 时间线">
          <h2 className="sr-only">Trajectory</h2>

          {ordered.map((node) => {
            // 里程碑插在它对应的那条节点之前 —— 三个时间尺度共用一条主干，
            // 而不是三条并排的轨道（那会让"跨度"这件事失��）。
            const milestone = space.milestones.find(
              (m) => m.nodeId === node.id
            )
            const period = space.periods.find((p) => p.nodeIds.includes(node.id))
            const firstInPeriod = period && period.nodeIds[0] === node.id

            return (
              <div key={node.id}>
                {firstInPeriod && period && (
                  <PeriodBlock
                    title={period.title}
                    dateRange={period.dateRange}
                    summary={period.summary}
                    count={period.nodeIds.length}
                  />
                )}
                {milestone && (
                  <MilestoneBlock
                    title={milestone.title}
                    date={milestone.date}
                    because={milestone.because}
                  />
                )}
                <NodeCard
                  node={node}
                  onAskEvidence={(n) =>
                    setDrawer({ claim: n.whatChanged, items: n.evidence })
                  }
                />
              </div>
            )
          })}

          <TodayAnchor space={space} />
        </section>

        <footer className="mt-16 border-t border-border pt-6">
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground/70">
            <RefreshCw className="mr-1.5 inline size-3" aria-hidden />
            这一页读到的是**已有的那几张表**（目标 · 记忆 · 学习状态 · 记录 · 产物 · 对话），
            不是另一套数据。当前是 mock。
          </p>
        </footer>
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
