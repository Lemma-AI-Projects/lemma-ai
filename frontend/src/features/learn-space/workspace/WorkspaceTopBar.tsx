import { ChevronLeft, ChevronRight, Flag, Minus, Plus, Settings, X } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { WorkspaceEditMenu, WorkspaceModeMenu, type WorkspaceView } from './WorkspaceMenus'
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
  /** 当前视角。缩放与分页只在聚焦里出现（见 learn-space-design.md §2）。 */
  view: WorkspaceView
  onChangeView: (view: WorkspaceView) => void
  /**
   * 切到**聚焦**（单份资料那一屏）。它不在这个工作台上原地换布局 —— 它是一条
   * 独立路由（`learn-spaces/:id/focus` 是它的空态），所以要给一个真去处，
   * 而不是把 view 改成 'focus' 然后画一片空白。
   */
  onOpenFocus?: () => void
  /** `edit` 的两个新建动作与上传（网格 / 画板里都能用）。 */
  onNewFolder: () => void
  onNewNote: () => void
  onUpload: (files: File[]) => void
  /** 画布缩放百分比（50–200）。只在聚焦模式下渲染。 */
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  /** 画布分页：当前只渲染一页，箭头保持禁用。只在聚焦模式下渲染。 */
  pageIndex: number
  pageCount: number
  onClose: () => void
  onOpenSettings: () => void
}

export function WorkspaceTopBar({
  name,
  isNameLoading,
  view,
  onChangeView,
  onOpenFocus,
  onNewFolder,
  onNewNote,
  onUpload,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  pageIndex,
  pageCount,
  onClose,
  onOpenSettings,
}: WorkspaceTopBarProps) {
  // 缩放与页面切换是**聚焦**的工具：网格是目录、画板是全景，都不需要它们。
  // 状态仍然留在 LearnSpaceWorkspace 里（聚焦要用），这里只是不渲染。
  const showsCanvasControls = view === 'focus'
  // `edit` 往空间里放东西：聚焦是读/写单件的地方，不放这一组。
  const showsEdit = view !== 'focus'

  return (
    <header className="flex h-11 shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={onClose}
        aria-label="退出空间"
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

      {showsEdit && (
        <WorkspaceEditMenu
          onNewFolder={onNewFolder}
          onNewNote={onNewNote}
          onUpload={onUpload}
        />
      )}

      {showsCanvasControls && (
        <>
          <div className={cn(WORKSPACE_PILL, 'gap-0.5 px-1')}>
            <button
              type="button"
              onClick={onZoomOut}
              disabled={zoom <= 50}
              aria-label="缩小"
              className={WORKSPACE_PILL_BUTTON}
            >
              <Minus className="size-4" />
            </button>
            <button
              type="button"
              onClick={onZoomReset}
              aria-label="重置缩放"
              className="w-16 rounded-full py-1 text-center text-sm tabular-nums text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10"
            >
              {zoom}%
            </button>
            <button
              type="button"
              onClick={onZoomIn}
              disabled={zoom >= 200}
              aria-label="放大"
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
              aria-label="上一页"
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
              aria-label="下一页"
              className={WORKSPACE_PILL_BUTTON}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </>
      )}

      <WorkspaceModeMenu
        view={view}
        onChange={onChangeView}
        onOpenFocus={onOpenFocus}
      />

      {/* 标记：参考稿有此按钮，行为未定义 → 禁用而不是假装可点。 */}
      <button
        type="button"
        disabled
        aria-label="标记"
        className={WORKSPACE_ICON_BUTTON}
      >
        <Flag className="size-[18px]" />
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="设置"
        className={WORKSPACE_ICON_BUTTON}
      >
        <Settings className="size-[18px]" />
      </button>
    </header>
  )
}
