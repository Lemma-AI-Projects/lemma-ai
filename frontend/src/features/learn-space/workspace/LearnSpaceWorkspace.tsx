import { useCallback, useState } from 'react'

import type { CurrentUser } from '@/features/auth/useCurrentUser'
import { ShelterDrawer } from '@/features/docs/ShelterDrawer'
import { HomeSettingsDialog } from '@/features/home/HomeSettingsDialog'
import { ConversationPanel } from './ConversationPanel'
import { WorkspaceCanvas } from './WorkspaceCanvas'
import { WorkspaceDock } from './WorkspaceDock'
import { WorkspaceTopBar } from './WorkspaceTopBar'
import type { WorkspaceNode } from './workspaceTypes'

const ZOOM_MIN = 50
const ZOOM_MAX = 200
const ZOOM_STEP = 10
const ZOOM_RESET = 100

export interface LearnSpaceWorkspaceProps {
  /** 当前 learn space 的 id（板块数据按它取、抽屉按它挂）。 */
  projectId: string
  spaceName: string
  isNameLoading?: boolean
  /** 画布节点（当前为空间内的对话）。 */
  nodes: WorkspaceNode[]
  /** 有值时画布区显示该错误文案。 */
  errorText?: string
  /** 传给设置弹窗；预览态（未登录）为 undefined。 */
  account?: CurrentUser
  onClose: () => void
  onStartConversation: (text: string) => void
  onNewConversation: () => void
  onOpenNode: (node: WorkspaceNode) => void
  /** 从 shelter 抽屉进一块板。 */
  onOpenPage: (pageId: string) => void
}

/**
 * 学习空间工作台：全屏白色画布 + 顶部悬浮工具条 + 右侧对话面板 + 底部 dock。
 *
 * 布局对齐参考稿：工具条与画布同属左侧一列，右侧面板与工具条顶端齐平、
 * 占满整列高度。侧栏在这里不出现（该路由不套 AppLayout）。shelter 抽屉在左侧，
 * 与右侧对话面板对称，二者可同时点开。
 */
export function LearnSpaceWorkspace({
  projectId,
  spaceName,
  isNameLoading,
  nodes,
  errorText,
  account,
  onClose,
  onStartConversation,
  onNewConversation,
  onOpenNode,
  onOpenPage,
}: LearnSpaceWorkspaceProps) {
  const [zoom, setZoom] = useState(ZOOM_RESET)
  const [isShelterOpen, setIsShelterOpen] = useState(false)
  const [isConversationOpen, setIsConversationOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleZoomIn = useCallback(
    () => setZoom((current) => Math.min(ZOOM_MAX, current + ZOOM_STEP)),
    []
  )
  const handleZoomOut = useCallback(
    () => setZoom((current) => Math.max(ZOOM_MIN, current - ZOOM_STEP)),
    []
  )
  const handleZoomReset = useCallback(() => setZoom(ZOOM_RESET), [])
  const handleToggleConversation = useCallback(
    () => setIsConversationOpen((current) => !current),
    []
  )
  const handleToggleShelter = useCallback(
    () => setIsShelterOpen((current) => !current),
    []
  )

  return (
    <div className="h-screen w-screen bg-zinc-100 p-2 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex h-full w-full gap-4 overflow-hidden rounded-2xl bg-white p-4 dark:bg-background">
        {isShelterOpen && (
          <ShelterDrawer
            projectId={projectId}
            onClose={() => setIsShelterOpen(false)}
            onOpenPage={onOpenPage}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <WorkspaceTopBar
            name={spaceName}
            isNameLoading={isNameLoading}
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
            pageIndex={1}
            pageCount={1}
            onClose={onClose}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          <div className="relative min-h-0 flex-1">
            {errorText ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-zinc-400">{errorText}</p>
              </div>
            ) : (
              <WorkspaceCanvas
                nodes={nodes}
                zoom={zoom}
                onOpenNode={onOpenNode}
              />
            )}

            <WorkspaceDock
              className="absolute inset-x-0 bottom-0"
              onCommandRoom={onNewConversation}
              isShelterOpen={isShelterOpen}
              onToggleShelter={handleToggleShelter}
              isConversationOpen={isConversationOpen}
              onToggleConversation={handleToggleConversation}
            />
          </div>
        </div>

        {isConversationOpen && (
          <ConversationPanel
            className="w-[17rem]"
            spaceName={spaceName}
            onClose={handleToggleConversation}
            onSubmit={onStartConversation}
          />
        )}
      </div>

      <HomeSettingsDialog
        account={account}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  )
}
