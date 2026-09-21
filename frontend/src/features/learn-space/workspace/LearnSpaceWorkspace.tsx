import { useCallback, useMemo, useState } from 'react'

import { AgentContextInspector } from '@/features/agent/AgentContextInspector'
import type { CurrentUser } from '@/features/auth/useCurrentUser'
import { ShelterDrawer } from '@/features/docs/ShelterDrawer'
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
  /**
   * 当前 learn space 的 id（板块数据按它取、抽屉按它挂）。
   * 可选：`/preview/` 下的纯 mock 预览页没有真实空间，那里抽屉就该是不可用的。
   */
  projectId?: string
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
  onNewConversation: () => void
  onOpenNode: (node: WorkspaceNode) => void
  /**
   * 从 shelter 抽屉进一块板。**给了才认为抽屉可用** —— 不给则 dock 上那个
   * 槽位保持占位，不做点了没反应的按钮。
   */
  onOpenPage?: (pageId: string) => void
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
 * 左侧只留一个位置：shelter（空间里有什么）与 Brief（我学到哪了）互斥 ——
 * 两个都开会把画布挤成中间一条，而它们回答的是同一类问题（「这个空间里有什么」）。
 */
export function LearnSpaceWorkspace({
  projectId,
  spaceName,
  isNameLoading,
  nodes,
  errorText,
  account,
  onClose,
  onNewConversation,
  onOpenNode,
  onOpenPage,
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
  const [isShelterOpen, setIsShelterOpen] = useState(false)
  const [isContextOpen, setIsContextOpen] = useState(false)
  // undefined = 还没选，跟着这个空间最近的一段对话走；null = 明确要一段新的。
  // 不额外查一次：画布上的节点就是本空间的对话列表。
  const [conversationChoice, setConversationChoice] = useState<
    string | null | undefined
  >(undefined)
  const latestConversationId = useMemo(() => {
    const node = nodes.find((item) => item.href?.startsWith('/chat/'))
    return node?.id ?? null
  }, [nodes])
  const activeConversationId =
    conversationChoice === undefined ? latestConversationId : conversationChoice
  // 抽屉可用与否，取决于调用方给不给「点开一块板」的出口 —— 给了才显示按钮。
  // 没有 projectId（mock 预览页）就没有可取的板块，按钮同样不出现。
  const isShelterAvailable = Boolean(onOpenPage && projectId)

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
  // 两个都开会把画布挤成中间一条，而它们回答的是同一类问题。
  const handleToggleShelter = useCallback(() => {
    setIsShelterOpen((current) => !current)
    setIsContextOpen(false)
    // Brief 未启用时不动它的选择 —— 否则会把「默认打开」一起关掉。
    if (brief !== undefined) setBriefOpenChoice(false)
  }, [brief])
  const handleCloseShelter = useCallback(() => setIsShelterOpen(false), [])
  // 三者互斥：同一侧只放一个面板，同时开会把画布挤成中间一条。
  const handleToggleContext = useCallback(() => {
    setIsContextOpen((current) => !current)
    setIsShelterOpen(false)
    if (brief !== undefined) setBriefOpenChoice(false)
  }, [brief])
  const handleCloseContext = useCallback(() => setIsContextOpen(false), [])
  // 「指挥室」不再是跳去 /chat：工作台里就有真对话，那就地开一段新的。
  const handleCommandRoom = useCallback(() => {
    setConversationChoice(null)
    setIsConversationOpen(true)
  }, [])
  const handleToggleBrief = useCallback(() => {
    setBriefOpenChoice(!isBriefOpen)
    setIsShelterOpen(false)
    setIsContextOpen(false)
  }, [isBriefOpen])
  const handleCloseBrief = useCallback(() => setBriefOpenChoice(false), [])

  return (
    <div className="h-screen w-screen bg-zinc-100 p-2 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex h-full w-full gap-4 overflow-hidden rounded-2xl bg-white p-4 dark:bg-background">
        {isShelterOpen && onOpenPage && projectId && (
          <ShelterDrawer
            projectId={projectId}
            onClose={handleCloseShelter}
            onOpenPage={onOpenPage}
          />
        )}

        {isContextOpen && projectId && (
          <AgentContextInspector
            projectId={projectId}
            conversationId={activeConversationId ?? undefined}
            onClose={handleCloseContext}
          />
        )}

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
              onCommandRoom={handleCommandRoom}
              isShelterAvailable={isShelterAvailable}
              isShelterOpen={isShelterOpen}
              onToggleShelter={handleToggleShelter}
              isContextAvailable={Boolean(projectId)}
              isContextOpen={isContextOpen}
              onToggleContext={handleToggleContext}
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
            className="w-[22rem]"
            projectId={projectId}
            spaceName={spaceName}
            conversationId={activeConversationId}
            onConversationChange={setConversationChoice}
            onClose={handleToggleConversation}
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
