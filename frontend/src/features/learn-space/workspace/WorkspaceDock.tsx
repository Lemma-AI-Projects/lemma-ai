import { AlignLeft, MessageCircle, Plus } from 'lucide-react'

import { useAppTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { WORKSPACE_DOCK_SLOT } from './workspaceStyles'

export interface WorkspaceDockProps {
  /** 「指挥室」：在当前空间里开一段新对话。 */
  onCommandRoom: () => void
  /** 「庇护所」：左侧板块抽屉。 */
  isShelterOpen: boolean
  onToggleShelter: () => void
  isConversationOpen: boolean
  onToggleConversation: () => void
  className?: string
}

/**
 * 画布底部的悬浮 dock。
 *
 * 参考稿里有四个槽位：command room（+）、shelter（≡）、windows layout、
 * pending。shelter 已实装为左侧板块抽屉；后两个行为未定义，按禁用态渲染 ——
 * 形状与参考稿一致，不会出现「点了没反应」的假按钮。
 */
export function WorkspaceDock({
  onCommandRoom,
  isShelterOpen,
  onToggleShelter,
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

        {/* windows layout / pending：位置先占住，行为待定义。 */}
        <div aria-hidden className={WORKSPACE_DOCK_SLOT} />
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
