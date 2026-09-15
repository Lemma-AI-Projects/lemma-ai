import { AlignLeft, ClipboardList, MessageCircle, Plus } from 'lucide-react'

import { useAppTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { WORKSPACE_DOCK_SLOT } from './workspaceStyles'

export interface WorkspaceDockProps {
  /** 「指挥室」：在当前空间里开一段新对话。 */
  onCommandRoom: () => void
  /** 「庇护所」：左侧板块抽屉。 */
  isShelterOpen: boolean
  onToggleShelter: () => void
  /**
   * Learning Brief 是否可用。false 时该槽位退回占位 —— 板块没数据就没有开关，
   * 不做「点了没反应」的按钮。
   */
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
 * 参考稿里有四个槽位：command room（+）、shelter（≡）、learning brief、
 * pending。shelter 是左侧板块抽屉，brief 是左侧学习状态摘要（与 shelter 互斥）；
 * 最后一个行为未定义，按占位渲染 —— 形状与参考稿一致。
 */
export function WorkspaceDock({
  onCommandRoom,
  isShelterOpen,
  onToggleShelter,
  isBriefAvailable,
  isBriefOpen,
  onToggleBrief,
  isConversationOpen,
  onToggleConversation,
  className,
}: WorkspaceDockProps) {
  const { t } = useAppTranslation()

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCommandRoom}
          aria-label={t('workspace.commandRoom')}
          title={t('workspace.commandRoom')}
          className={cn(
            WORKSPACE_DOCK_SLOT,
            'hover:bg-zinc-200 hover:text-zinc-900'
          )}
        >
          <Plus className="size-5" />
        </button>

        <button
          type="button"
          onClick={onToggleShelter}
          aria-pressed={isShelterOpen}
          aria-label={t('workspace.shelter')}
          title={t('workspace.shelter')}
          className={cn(
            WORKSPACE_DOCK_SLOT,
            isShelterOpen
              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
              : 'hover:bg-zinc-200 hover:text-zinc-900'
          )}
        >
          <AlignLeft className="size-5" />
        </button>

        {isBriefAvailable ? (
          <button
            type="button"
            onClick={onToggleBrief}
            aria-pressed={isBriefOpen}
            aria-label={t('workspace.briefTitle')}
            title={t('workspace.briefTitle')}
            className={cn(
              WORKSPACE_DOCK_SLOT,
              isBriefOpen
                ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                : 'hover:bg-zinc-200 hover:text-zinc-900'
            )}
          >
            <ClipboardList className="size-5" />
          </button>
        ) : (
          <div aria-hidden className={WORKSPACE_DOCK_SLOT} />
        )}

        {/* pending：位置先占住，行为待定义。 */}
        <div aria-hidden className={WORKSPACE_DOCK_SLOT} />
      </div>

      <button
        type="button"
        onClick={onToggleConversation}
        aria-pressed={isConversationOpen}
        aria-label={t('workspace.toggleConversation')}
        title={t('workspace.toggleConversation')}
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
