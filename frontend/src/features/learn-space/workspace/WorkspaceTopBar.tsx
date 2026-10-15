import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Minus,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Settings,
  X,
} from 'lucide-react'

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
  /**
   * 空间名旁边那一行**方位**：`考到 117 分 · 还有 61 天`。
   *
   * 它由页面算好传进来（`goalText.goalLine`），顶栏不认识"目标"这个对象 —— 否则
   * 一个标题栏会开始知道决策层的词汇。没有目标时传 `null`，这里什么都不加：
   * 一个空的目标位比一句"还没有目标"更不打扰人。
   */
  goalLine?: string | null
  /** 当前视角。缩放与分页只在聚焦里出现（见 learn-space-design.md §2）。 */
  view: WorkspaceView
  onChangeView: (view: WorkspaceView) => void
  /**
   * 切到**聚焦**（单份资料那一屏）。它不在这个工作台上原地换布局 —— 它是一条
   * 独立路由（`learn-spaces/:id/focus` 是它的空态），所以要给一个真去处，
   * 而不是把 view 改成 'focus' 然后画一片空白。
   */
  onOpenFocus?: () => void
  /**
   * 切到**轨迹**（这个空间发生过什么）。和聚焦同理：它有独立路由
   * （`learn-spaces/:id/trajectory`），是"走过去"而不是原地换布局。
   * 没给这个回调时那一项禁用 —— 预览页没有真实空间，过去了也读不到东西。
   */
  onOpenTrajectory?: () => void
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
  /** 右侧「新对话」面板是否展开。顶栏在所有视角都在，开关放这里才「随时够得着」。 */
  isConversationOpen: boolean
  onToggleConversation: () => void
  onClose: () => void
  onOpenSettings: () => void
}

export function WorkspaceTopBar({
  name,
  isNameLoading,
  goalLine,
  view,
  onChangeView,
  onOpenFocus,
  onOpenTrajectory,
  onNewFolder,
  onNewNote,
  onUpload,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  pageIndex,
  pageCount,
  isConversationOpen,
  onToggleConversation,
  onClose,
  onOpenSettings,
}: WorkspaceTopBarProps) {
  // ⚠️ 这里原来写的是 `view === 'focus'` / `view !== 'focus'`，而 `view` **从来不可能**
  // 等于 'focus'（聚焦是最外层另一条路由，不在这块工作台上）。把类型收窄成
  // `'grid' | 'board'` 之后这件事才露出来：
  //   * `showsEdit` 恒为 true ⇒ 编辑菜单**一直在渲染**（下面直接渲染，去掉这个标志）；
  //   * `showsCanvasControls` 恒为 false ⇒ **缩放控件从来没有渲染过**，也就是说
  //     画板的 `zoom` 一直恒为 100（`WorkspaceCanvas` 没有滚轮缩放）。
  // 这一轮只收拾切换栏，**不改这个行为**：保持不渲染，问题如实记在这里，
  // 「要不要给画板补一个真的缩放入口」是另一个决定（代码在 git 历史里，随时能捡回来）。
  const showsCanvasControls = false

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

      {goalLine && (
        <span
          title={goalLine}
          className="hidden max-w-64 truncate text-xs text-zinc-400 sm:block"
        >
          {goalLine}
        </span>
      )}

      <div className="min-w-0 flex-1" />

      <WorkspaceEditMenu
        onNewFolder={onNewFolder}
        onNewNote={onNewNote}
        onUpload={onUpload}
      />

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
        onOpenTrajectory={onOpenTrajectory}
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

      {/* 右侧「新对话」面板的显示 / 隐藏。所有视角都在（网格 / 画板都要用到）。 */}
      <button
        type="button"
        onClick={onToggleConversation}
        aria-label={isConversationOpen ? '隐藏对话' : '显示对话'}
        aria-pressed={isConversationOpen}
        className={WORKSPACE_ICON_BUTTON}
      >
        {isConversationOpen ? (
          <PanelRightClose className="size-[18px]" />
        ) : (
          <PanelRightOpen className="size-[18px]" />
        )}
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
