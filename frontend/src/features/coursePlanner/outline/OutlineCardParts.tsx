import type { ReactNode } from 'react'
import { CircleCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { OutlineKnowledgePoint, OutlinePhase } from './types'

// 三套方案共用的卡片零件。卡片壳与底部按钮的尺寸照抄 ConversationToolShell，
// 选定方案并入对话卡片时两边自然收敛成一份。

const actionButtonClassName =
  'h-[33px] rounded-full px-[12.5px] text-[14px] font-normal'
export const outlineSecondaryButtonClassName = `${actionButtonClassName} border-zinc-300 bg-transparent text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950`
const primaryButtonClassName = `${actionButtonClassName} bg-zinc-950 text-white hover:bg-zinc-800`

export type OutlineView = 'map' | 'schedule'

export function OutlineCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="conversation-tool-shell"
      translate="no"
      className={cn(
        'flex w-full max-w-[36rem] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-transparent px-5 py-5',
        className
      )}
    >
      {children}
    </div>
  )
}

const GENERATING_TITLE_PREFIX: Record<Exclude<OutlinePhase, 'ready'>, string> = {
  mapping: '正在梳理知识地图：',
  scheduling: '正在编排课表：',
}

/** 生成中：转圈 + 当前步骤 + 课程名；就绪后与现有「已就绪」卡片的标题一致。 */
export function OutlineTitle({
  phase,
  title,
}: {
  phase: OutlinePhase
  title: string
}) {
  return (
    <h3 className="flex items-start gap-2 text-[19.5px] font-semibold leading-7 tracking-tight text-zinc-900">
      {phase !== 'ready' ? (
        <span className="flex h-7 w-5 shrink-0 translate-y-[1px] items-center justify-center">
          <Spinner
            aria-label={GENERATING_TITLE_PREFIX[phase]}
            className="size-[17px] text-zinc-900"
          />
        </span>
      ) : null}
      <span className="min-w-0">
        {phase === 'ready' ? '您的课程已就绪：' : GENERATING_TITLE_PREFIX[phase]}
        {title}
      </span>
    </h3>
  )
}

/**
 * 底部操作栏：左侧「编辑」，右侧「取消 / 确认」。生成中编辑与确认禁用，只留取消。
 * `start` 是方案 A 放视图切换按钮的插槽，排在「编辑」左边。
 */
export function OutlineFooter({
  phase,
  start,
  onEdit,
  onCancel,
  onConfirm,
}: {
  phase: OutlinePhase
  start?: ReactNode
  onEdit?: () => void
  onCancel?: () => void
  onConfirm?: () => void
}) {
  const generating = phase !== 'ready'

  return (
    <div className="-mx-1 -mb-1 mt-auto flex items-center justify-between gap-4 pt-4">
      <div className="flex items-center gap-2">
        {start}
        <Button
          type="button"
          variant="outline"
          disabled={generating}
          className={outlineSecondaryButtonClassName}
          onClick={onEdit}
        >
          编辑
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {generating ? (
          <Button
            type="button"
            variant="outline"
            className={outlineSecondaryButtonClassName}
            onClick={onCancel}
          >
            取消
          </Button>
        ) : null}
        <Button
          type="button"
          disabled={generating}
          className={primaryButtonClassName}
          onClick={onConfirm}
        >
          确认
        </Button>
      </div>
    </div>
  )
}

// 高度过渡用两头缓的曲线：前快后慢的曲线会让一行在第一帧就长出大半，看起来像跳。
const HEIGHT_TRANSITION =
  'transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none'

/** 用 grid 行高做的折叠：不需要量高度，收起时内容不可聚焦。 */
export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div
      inert={!open}
      className={cn('grid', HEIGHT_TRANSITION, className)}
      style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

/**
 * 挂载时从 0 高度长出来（@starting-style），用于生成中逐行浮现的章、单元和课。
 * 与 Collapse 同一套 grid 行高做法，两者同时发生（上一个单元收起、下一个单元长出）
 * 也不会互相打架。
 */
export function Reveal({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-rows-[1fr] opacity-100 starting:grid-rows-[0fr] starting:opacity-0',
        HEIGHT_TRANSITION,
        className
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

/** 「已在其他课学过」的轻标记：一个浅灰的小对勾，课表与知识地图共用。 */
export function LearnedMark({ className }: { className?: string }) {
  return (
    <CircleCheck
      aria-hidden
      strokeWidth={2}
      className={cn('size-3 shrink-0 text-zinc-400', className)}
    />
  )
}

/** 知识点胶囊，沿用搜索结果胶囊的尺寸。 */
export function KnowledgePointChip({
  point,
  highlighted = false,
  className,
}: {
  point: OutlineKnowledgePoint
  /** 与知识地图联动时的高亮，与地图上的节点同一种样子。 */
  highlighted?: boolean
  className?: string
}) {
  return (
    <span
      title={point.learnedIn ? `已在《${point.learnedIn}》学过` : undefined}
      className={cn(
        'inline-flex h-[22px] max-w-full items-center gap-1 rounded-full px-2 text-[12px] font-medium',
        point.learnedIn && 'pl-1.5',
        highlighted
          ? 'bg-white text-zinc-950 ring-1 ring-inset ring-zinc-900'
          : cn('bg-zinc-100', point.learnedIn ? 'text-zinc-500' : 'text-zinc-700'),
        className
      )}
    >
      {point.learnedIn ? <LearnedMark /> : null}
      <span className="truncate">{point.name}</span>
    </span>
  )
}
