import { useCallback, useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'

import type { CurrentUser } from '@/features/auth/useCurrentUser'
import { ShelterDrawer } from '@/features/docs/ShelterDrawer'
import {
  fetchMaterialObjectUrl,
  useCreatePageMutation,
  useDeletePageMutation,
  useProjectPagesQuery,
  useRenamePageMutation,
  useUploadMaterialMutation,
} from '@/features/docs/docApi'
import {
  describeMaterialError,
  isMaterialName,
  materialMimeFor,
} from '@/features/docs/importFile'
import type { DocPage } from '@/features/docs/types'
import { LearningBriefPanel } from '@/features/learn-space/brief/LearningBriefPanel'
import type {
  LearningBrief,
  LearningBriefNextStep,
} from '@/features/learn-space/brief/types'
import { HomeSettingsDialog } from '@/features/home/HomeSettingsDialog'
import { useActiveGoalQuery } from '@/features/learn-space/goal/goalApi'
import { goalLine } from '@/features/learn-space/goal/goalText'
import { ConversationPanel } from './ConversationPanel'
import { childrenOf } from './gridGroups'
import { WorkspaceCanvas } from './WorkspaceCanvas'
import { WorkspaceDock } from './WorkspaceDock'
import { WorkspaceGrid } from './WorkspaceGrid'
import { WorkspaceTopBar } from './WorkspaceTopBar'
import type { WorkspaceView } from './WorkspaceMenus'
import type { WorkspaceNode } from './workspaceTypes'

const ZOOM_MIN = 50
const ZOOM_MAX = 200
const ZOOM_STEP = 10
const ZOOM_RESET = 100

export interface LearnSpaceWorkspaceProps {
  /**
   * 当前 learn space 的 id（资料按它取、抽屉按它挂、上传按它落）。
   * 可选：`/preview/` 下的纯 mock 预览页没有真实空间，那里资料层就该是不可用的。
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
   * 从文档系统进一块板。**给了才认为文档系统可用** —— 不给则 dock 右侧 logo
   * 保持占位，不做点了没反应的按钮。
   */
  onOpenPage?: (pageId: string) => void
  /**
   * dimension 里的「聚焦」：单份资料那一屏是**另一条路由**（`learn-spaces/:id/focus`），
   * 不在这个工作台上原地换布局。不给就按不可选处理（预览页）。
   */
  onOpenFocus?: () => void
  /**
   * Learning Brief 数据。`undefined` = 板块未启用（dock 抽屉退回不渲染、面板不出现）；
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
 * 学习空间工作台：底部 dock 只在**画板**模式下出现；网格模式是"空间里有什么"的
 * 目录，聚焦模式是单件的读写面（还没做，见 learn-space-design.md）。
 *
 * 视角（`dimension`）切的是"怎么看"，不是"看什么"：同一份资料，网格铺成组、
 * 画板铺成关系图、聚焦只看一件。所以三处渲染共用同一个 `pages` 数据源。
 *
 * 左下角的文档抽屉与 Brief 互斥（答案都是"这个空间里有什么"）；但它是**画板/聚焦**
 * 的辅助面 —— 网格模式下不需要它，因为主区已经是那份目录了。
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
  onOpenFocus,
  brief,
  onOpenBriefStep,
  onRefreshBrief,
  isBriefRefreshing,
}: LearnSpaceWorkspaceProps) {
  const [zoom, setZoom] = useState(ZOOM_RESET)
  const [view, setView] = useState<WorkspaceView>('grid')
  // 网格当前进入的文件夹（null = 空间根）。文件夹不是"另一页"，是同一层目录的下一层。
  const [folderId, setFolderId] = useState<string | null>(null)
  const [materialNote, setMaterialNote] = useState<string | null>(null)
  // Brief 默认打开，但**用户手动关过之后以用户为准**。
  // 不能把默认值钉死在挂载那一刻：数据是异步来的（undefined → null → 对象），
  // 若用 useState(brief !== undefined) 初始化，接上后端后板块永远不会出现。
  const [briefOpenChoice, setBriefOpenChoice] = useState<boolean | null>(null)
  const isBriefOpen = briefOpenChoice ?? brief !== undefined
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  // undefined = 还没选，跟着这个空间最近的一段对话走；null = 明确要一段新的。
  // 不额外查一次：画布上的节点就是本空间的对话列表。
  const [conversationChoice, setConversationChoice] = useState<
    string | null | undefined
  >(undefined)

  const pagesQuery = useProjectPagesQuery(projectId)
  const createPage = useCreatePageMutation(projectId ?? '')
  const renamePage = useRenamePageMutation(projectId ?? '')
  const deletePage = useDeletePageMutation(projectId ?? '')
  const uploadMaterial = useUploadMaterialMutation(projectId ?? '')

  // 空间名旁边那一行方位。没有目标（或还没读到）时是 null —— 顶栏就什么都不加，
  // 而不是显示一句"还没有目标"：那属于简报，不属于标题栏。
  const { goal } = useActiveGoalQuery(projectId)
  const direction = goalLine(goal ?? null)

  const latestConversationId = useMemo(() => {
    const node = nodes.find((item) => item.href?.startsWith('/chat/'))
    return node?.id ?? null
  }, [nodes])
  const activeConversationId =
    conversationChoice === undefined ? latestConversationId : conversationChoice
  // 对话名就是画布节点标题 —— 不额外查一次，节点本来就是本空间的对话列表。
  // 草稿节点标题为空，退回 undefined 让面板用兜底文案。
  const activeConversationTitle = useMemo(() => {
    const node = nodes.find((item) => item.id === activeConversationId)
    return node?.title.trim() || undefined
  }, [nodes, activeConversationId])
  // 文档系统可用与否，取决于调用方给不给「点开一块板」的出口。
  // 没有 projectId（mock 预览页）就没有可取的板块 —— dock 上那个 logo 于是置灰，
  // 而不是留着点了没反应。
  const isDocumentsAvailable = Boolean(onOpenPage && projectId)

  const handleZoomIn = useCallback(
    () => setZoom((current) => Math.min(ZOOM_MAX, current + ZOOM_STEP)),
    []
  )
  const handleZoomOut = useCallback(
    () => setZoom((current) => Math.max(ZOOM_MIN, current - ZOOM_STEP)),
    []
  )
  const handleZoomReset = useCallback(() => setZoom(ZOOM_RESET), [])
  // 左下角只有一个位置：文档系统（空间里有什么）与 Brief（我学到哪了）互斥。
  const handleToggleDocuments = useCallback(() => {
    setIsDocumentsOpen((current) => !current)
    // Brief 未启用时不动它的选择 —— 否则会把「默认打开」一起关掉。
    if (brief !== undefined) setBriefOpenChoice(false)
  }, [brief])
  const handleCloseDocuments = useCallback(() => setIsDocumentsOpen(false), [])
  // 「新对话」不再是跳去 /chat：工作台里就有真对话，那就地开一段新的。
  const handleCommandRoom = useCallback(() => {
    setConversationChoice(null)
  }, [])
  const handleToggleBrief = useCallback(() => {
    setBriefOpenChoice(!isBriefOpen)
    setIsDocumentsOpen(false)
  }, [isBriefOpen])
  const handleCloseBrief = useCallback(() => setBriefOpenChoice(false), [])

  // --- 资料目录（网格）的三个动作 + 打开 --------------------------------------

  const handleNewNote = useCallback(() => {
    if (!projectId) return
    createPage.mutate({
      title: '未命名笔记',
      kind: 'note',
      parentPageId: folderId,
    })
  }, [projectId, createPage, folderId])

  const handleNewFolder = useCallback(() => {
    if (!projectId) return
    createPage.mutate({
      title: '新建文件夹',
      kind: 'folder',
      parentPageId: folderId,
    })
  }, [projectId, createPage, folderId])

  const handleUpload = useCallback(
    (files: File[]) => {
      if (!projectId) return
      setMaterialNote(null)
      for (const file of files) {
        if (!isMaterialName(file.name)) {
          setMaterialNote(`「${file.name}」不是支持的格式：只收 PDF 与图片。`)
          continue
        }
        uploadMaterial.mutate(
          { file, mime: materialMimeFor(file) },
          {
            onError: (error) => setMaterialNote(describeMaterialError(error)),
            onSuccess: () => setMaterialNote(null),
          }
        )
      }
    },
    [projectId, uploadMaterial]
  )

  const handleOpenMaterial = useCallback(async (page: DocPage) => {
    // 文件夹不是"打开一份东西"，是走进下一层目录。
    if (page.kind === 'folder') {
      setFolderId(page.id)
      return
    }
    // 有文件的（PDF / 图片）走字节：读接口在 token 后面，所以取 blob 再交给浏览器。
    if (page.originalName) {
      try {
        const url = await fetchMaterialObjectUrl(page.id)
        window.open(url, '_blank', 'noopener')
        // 新标签页已经拿到这份 blob，给它一分钟再回收。
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      } catch (error) {
        setMaterialNote(describeMaterialError(error))
      }
      return
    }
    onOpenPage?.(page.id)
  }, [onOpenPage])

  const visiblePages = useMemo(
    () => childrenOf(pagesQuery.data ?? [], folderId),
    [pagesQuery.data, folderId]
  )
  const openFolder = useMemo(
    () => (folderId ? (pagesQuery.data ?? []).find((page) => page.id === folderId) : null),
    [pagesQuery.data, folderId]
  )

  return (
    <div className="h-screen w-screen bg-zinc-100 p-2 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex h-full w-full gap-4 overflow-hidden rounded-2xl bg-white p-4 dark:bg-background">
        {isDocumentsOpen && onOpenPage && projectId && (
          <ShelterDrawer
            projectId={projectId}
            onClose={handleCloseDocuments}
            onOpenPage={onOpenPage}
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
            goalLine={direction}
            view={view}
            onChangeView={setView}
            onOpenFocus={onOpenFocus}
            onNewFolder={handleNewFolder}
            onNewNote={handleNewNote}
            onUpload={handleUpload}
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
            ) : view === 'grid' ? (
              <div className="flex h-full min-h-0 flex-col">
                {(openFolder || materialNote) && (
                  <div className="flex shrink-0 items-center gap-3 pb-2">
                    {openFolder && (
                      <button
                        type="button"
                        onClick={() => setFolderId(null)}
                        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] text-zinc-600 transition-colors hover:bg-zinc-100"
                      >
                        <ChevronLeft className="size-3.5" />
                        回到空间
                      </button>
                    )}
                    {materialNote ? (
                      <p className="text-[13px] text-zinc-500" data-material-note>
                        {materialNote}
                      </p>
                    ) : null}
                  </div>
                )}
                <div className="min-h-0 flex-1">
                  <WorkspaceGrid
                    pages={visiblePages}
                    isLoading={Boolean(projectId) && pagesQuery.isPending}
                    isError={pagesQuery.isError}
                    onOpenPage={handleOpenMaterial}
                    onRename={(page, title) => renamePage.mutate({ pageId: page.id, title })}
                    onDelete={(page) => deletePage.mutate(page.id)}
                  />
                </div>
              </div>
            ) : (
              <WorkspaceCanvas nodes={nodes} zoom={zoom} onOpenNode={onOpenNode} />
            )}

            {/* 底部 dock 是**画板**的工具（新对话 / 抽屉 / 文档系统），
                网格是目录、聚焦是单件，都不需要它。 */}
            {view === 'board' && (
              <WorkspaceDock
                className="absolute inset-x-0 bottom-0"
                onCommandRoom={handleCommandRoom}
                isBriefAvailable={brief !== undefined}
                isBriefOpen={isBriefOpen}
                onToggleBrief={handleToggleBrief}
                isDocumentsAvailable={isDocumentsAvailable}
                isDocumentsOpen={isDocumentsOpen}
                onToggleDocuments={handleToggleDocuments}
              />
            )}
          </div>
        </div>

        <ConversationPanel
          className="w-[22rem]"
          projectId={projectId}
          spaceName={spaceName}
          conversationId={activeConversationId}
          conversationTitle={activeConversationTitle}
          onConversationChange={setConversationChoice}
          onOpenDocuments={isDocumentsAvailable ? handleToggleDocuments : undefined}
        />
      </div>

      <HomeSettingsDialog
        account={account}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  )
}
