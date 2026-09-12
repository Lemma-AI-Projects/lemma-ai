import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Minus,
  Plus,
  Settings,
  X,
} from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { useAppTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import {
  WORKSPACE_ICON_BUTTON,
  WORKSPACE_PILL,
  WORKSPACE_PILL_BUTTON,
} from './workspaceStyles'

export interface WorkspaceTopBarProps {
  /** 空间名（数据层为 project.name）。 */
  name: string
  /** 名称还在取：画骨架，不闪空胶囊。 */
  isNameLoading?: boolean
  /** 画布缩放百分比（50–200）。 */
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  /** 画布分页：当前只渲染一页，箭头保持禁用。 */
  pageIndex: number
  pageCount: number
  onClose: () => void
  onOpenSettings: () => void
}

export function WorkspaceTopBar({
  name,
  isNameLoading,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  pageIndex,
  pageCount,
  onClose,
  onOpenSettings,
}: WorkspaceTopBarProps) {
  const { t } = useAppTranslation()

  return (
    <header className="flex h-11 shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={onClose}
        aria-label={t('workspace.close')}
        className={WORKSPACE_ICON_BUTTON}
      >
        <X className="size-[18px]" />
      </button>

      <div className={cn(WORKSPACE_PILL, 'gap-2 pl-5 pr-4')}>
        {isNameLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <span className="max-w-56 truncate text-sm font-medium text-zinc-900">
            {name}
          </span>
        )}
        {/* 参考稿里名称右侧的小柱状图标：点击行为未定义，先只做装饰，
            不做成一个点了没反应的假按钮。 */}
        <span aria-hidden className="flex items-end gap-[2px] ps-1">
          <span className="h-1.5 w-[3px] rounded-full bg-zinc-300" />
          <span className="h-3 w-[3px] rounded-full bg-zinc-300" />
          <span className="h-2 w-[3px] rounded-full bg-zinc-300" />
        </span>
      </div>

      <div className="min-w-0 flex-1" />

      <div className={cn(WORKSPACE_PILL, 'gap-0.5 px-1')}>
        <button
          type="button"
          onClick={onZoomOut}
          disabled={zoom <= 50}
          aria-label={t('workspace.zoomOut')}
          className={WORKSPACE_PILL_BUTTON}
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          onClick={onZoomReset}
          aria-label={t('workspace.zoomReset')}
          className="w-16 rounded-full py-1 text-center text-sm tabular-nums text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10"
        >
          {zoom}%
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          disabled={zoom >= 200}
          aria-label={t('workspace.zoomIn')}
          className={WORKSPACE_PILL_BUTTON}
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className={cn(WORKSPACE_PILL, 'gap-0.5 px-1')}>
        {/* 画布还没有分页概念，两侧箭头保持禁用而不是假装能翻。 */}
        <button
          type="button"
          disabled
          aria-label={t('workspace.previousPage')}
          className={WORKSPACE_PILL_BUTTON}
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-1 text-sm tabular-nums text-zinc-700">
          {pageIndex} / {pageCount}
        </span>
        <button
          type="button"
          disabled
          aria-label={t('workspace.nextPage')}
          className={WORKSPACE_PILL_BUTTON}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* 标记：参考稿有此按钮，行为未定义 → 禁用而不是假装可点。 */}
      <button
        type="button"
        disabled
        aria-label={t('workspace.flag')}
        className={WORKSPACE_ICON_BUTTON}
      >
        <Flag className="size-[18px]" />
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label={t('workspace.settings')}
        className={WORKSPACE_ICON_BUTTON}
      >
        <Settings className="size-[18px]" />
      </button>
    </header>
  )
}
