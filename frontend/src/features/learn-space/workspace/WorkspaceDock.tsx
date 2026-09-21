import { AlignLeft, ClipboardList, MessageCircle, Plus, Radar } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  WORKSPACE_PILL,
  WORKSPACE_PILL_BUTTON,
  WORKSPACE_PILL_BUTTON_ACTIVE,
} from './workspaceStyles'

export interface WorkspaceDockProps {
  /** 「指挥室」：在当前空间里开一段新对话。 */
  onCommandRoom: () => void
  /**
   * 「庇护所」（左侧板块抽屉）是否可用。false 时该槽位退回占位 ——
   * 板块数据来自文档层（本分支尚未接入），没数据就没有开关，
   * 不做「点了没反应」的按钮。
   */
  isShelterAvailable?: boolean
  isShelterOpen?: boolean
  onToggleShelter?: () => void
  /**
   * Learning Brief 是否可用。false 时该槽位退回占位 —— 板块没数据就没有开关，
   * 不做「点了没反应」的按钮。
   */
  /**
   * 「Space Context」是否可用（要有真实空间）。false 时槽位不渲染 ——
   * 没数据就没有开关，不做点了没反应的按钮。
   */
  isContextAvailable?: boolean
  isContextOpen?: boolean
  onToggleContext?: () => void
  isBriefAvailable: boolean
  isBriefOpen: boolean
  onToggleBrief: () => void
  isConversationOpen: boolean
  onToggleConversation: () => void
  className?: string
}

/**
 * 画布底部的悬浮 dock。
 *
 * 参考稿里有四个槽位：指挥室（+）、庇护所（≡）、学习简报、pending。
 * 四个槽位收在**一个**胶囊里，与顶部工具条共用同一套形状（WORKSPACE_PILL +
 * 胶囊内分段按钮）—— 原先它们是四块各自独立的灰块，每块 112px 只放一个图标，
 * 在白色画布上读起来是四条空条，也没跟顶部说同一种话。
 */
export function WorkspaceDock({
  onCommandRoom,
  isShelterAvailable,
  isShelterOpen,
  onToggleShelter,
  isContextAvailable,
  isContextOpen,
  onToggleContext,
  isBriefAvailable,
  isBriefOpen,
  onToggleBrief,
  isConversationOpen,
  onToggleConversation,
  className,
}: WorkspaceDockProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className={cn(WORKSPACE_PILL, 'gap-0.5 px-1')}>
        <button
          type="button"
          onClick={onCommandRoom}
          aria-label="指挥室"
          title="指挥室"
          className={WORKSPACE_PILL_BUTTON}
        >
          <Plus className="size-[18px]" />
        </button>

        {/* 槽位只在可用时渲染：没有实现的槽位留一块空白，
            在胶囊里读起来是「排版漏了一块」，比缺一个按钮更糟。 */}
        {isShelterAvailable && (
          <button
            type="button"
            onClick={onToggleShelter}
            aria-pressed={isShelterOpen}
            aria-label="庇护所"
            title="庇护所"
            className={cn(
              WORKSPACE_PILL_BUTTON,
              isShelterOpen && WORKSPACE_PILL_BUTTON_ACTIVE
            )}
          >
            <AlignLeft className="size-[18px]" />
          </button>
        )}

        {isContextAvailable && (
          <button
            type="button"
            onClick={onToggleContext}
            aria-pressed={isContextOpen}
            aria-label="Space Context"
            title="Space Context：Agent 到底看到了什么"
            className={cn(
              WORKSPACE_PILL_BUTTON,
              isContextOpen && WORKSPACE_PILL_BUTTON_ACTIVE
            )}
          >
            <Radar className="size-[18px]" />
          </button>
        )}

        {isBriefAvailable && (
          <button
            type="button"
            onClick={onToggleBrief}
            aria-pressed={isBriefOpen}
            aria-label="学习简报"
            title="学习简报"
            className={cn(
              WORKSPACE_PILL_BUTTON,
              isBriefOpen && WORKSPACE_PILL_BUTTON_ACTIVE
            )}
          >
            <ClipboardList className="size-[18px]" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleConversation}
        aria-pressed={isConversationOpen}
        aria-label="对话面板"
        title="对话面板"
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full border bg-white transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10',
          isConversationOpen
            ? 'border-zinc-900 text-zinc-900'
            : 'border-zinc-200/80 text-zinc-500 hover:text-zinc-900'
        )}
      >
        <MessageCircle className="size-[18px]" />
      </button>
    </div>
  )
}
