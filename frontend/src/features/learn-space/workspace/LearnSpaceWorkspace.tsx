import { useCallback, useState } from 'react'

import type { CurrentUser } from '@/features/auth/useCurrentUser'
import { LearningBriefPanel } from '@/features/learn-space/brief/LearningBriefPanel'
import type {
  LearningBrief,
  LearningBriefNextStep,
} from '@/features/learn-space/brief/types'
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
  /** 空间名（数据层为 project.name）。 */
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
  /**
   * Learning Brief 数据。`undefined` = 板块未启用（dock 槽位退回占位、面板不出现）；
   * `null` = 读取中（面板先出骨架）；对象 = 有数据。默认打开。
   */
  brief?: LearningBrief | null
  /** 打开「接下来」里的某一步。 */
  onOpenBriefStep?: (step: LearningBriefNextStep) => void
  /** 手动重算；未接后端时不传，刷新按钮不渲染。 */
  onRefreshBrief?: () => void
  isBriefRefreshing?: boolean
}

/**
 * 学习空间工作台：全屏白色画布 + 顶部悬浮工具条 + 底部 dock，
 * 左侧是 Learning Brief，右侧是对话面板。
 *
 * 布局对齐参考稿：工具条与画布同属左侧一列，右侧面板与工具条顶端齐平、
 * 占满整列高度。侧栏在这里不出现（该路由不套 AppLayout）。
 *
 * 左侧只留一个位置：Brief（我学到哪了）。参考稿里与它互斥的「板块抽屉」
 * （空间里有什么）数据来自文档层，本分支尚未接入 —— 所以 dock 上那个槽位
 * 是占位，不是可点的按钮。
 */
export function LearnSpaceWorkspace({
  spaceName,
  isNameLoading,
  nodes,
  errorText,
  account,
  onClose,
  onStartConversation,
  onNewConversation,
  onOpenNode,
  brief,
  onOpenBriefStep,
  onRefreshBrief,
  isBriefRefreshing,
}: LearnSpaceWorkspaceProps) {
  const [zoom, setZoom] = useState(ZOOM_RESET)
  // Brief 默认打开，但**用户手动关过之后以用户为准**。
  // 不能把默认值钉死在挂载那一刻：数据是异步来的（undefined → null → 对象），
  // 若用 useState(brief !== undefined) 初始化，接上后端后板块永远不会出现。
  const [briefOpenChoice, setBriefOpenChoice] = useState<boolean | null>(null)
  const isBriefOpen = briefOpenChoice ?? brief !== undefined
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
  // 左侧只有一个位置：板块抽屉（空间里有什么）与 Brief（我学到哪了）互斥。
  // 抽屉尚未接入，所以现在这一侧只有 Brief 的开合。
  const handleToggleBrief = useCallback(() => {
    setBriefOpenChoice(!isBriefOpen)
  }, [isBriefOpen])
  const handleCloseBrief = useCallback(() => setBriefOpenChoice(false), [])

  return (
    <div className="h-screen w-screen bg-zinc-100 p-2 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex h-full w-full gap-4 overflow-hidden rounded-2xl bg-white p-4 dark:bg-background">
        {isBriefOpen && brief !== undefined && (
          <LearningBriefPanel
            brief={brief}
            onClose={handleCloseBrief}
            onOpenStep={(step) => onOpenBriefStep?.(step)}
            onStartConversation={onNewConversation}
            onRefresh={onRefreshBrief}
            isRefreshing={isBriefRefreshing}
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
              // 庇护所（板块抽屉）的数据来自文档层，本分支尚未接入：
              // 槽位保持占位，接上之后在这里换成状态与回调。
              isShelterAvailable={false}
              isBriefAvailable={brief !== undefined}
              isBriefOpen={isBriefOpen}
              onToggleBrief={handleToggleBrief}
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
