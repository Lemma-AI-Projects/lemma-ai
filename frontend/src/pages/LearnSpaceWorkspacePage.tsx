import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useCurrentUser } from '@/features/auth/useCurrentUser'
import { LearnSpaceWorkspace } from '@/features/learn-space/workspace/LearnSpaceWorkspace'
import type { WorkspaceNode } from '@/features/learn-space/workspace/workspaceTypes'
import {
  useProjectConversationsQuery,
  useProjectQuery,
} from '@/features/project/projectApi'
import { useAppTranslation } from '@/i18n'
import { isNotFoundError } from '@/lib/apiUtils'

/** 画布初始排布：每行 3 张（卡片宽 176 + 32 间距），行高 112。 */
const NODE_ORIGIN_X = 40
const NODE_ORIGIN_Y = 80
const NODE_COLUMN_PX = 208
const NODE_ROW_PX = 112
const NODE_COLUMNS = 3

/**
 * 学习空间工作台（空间详情）。
 *
 * 数据层仍是 projects：空间名 = project.name，画布节点 = 该空间下的对话。
 * 不套 AppLayout —— 参考稿是全屏画布 + 自带顶栏，没有侧栏。
 */
export function LearnSpaceWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useAppTranslation()
  const projectQuery = useProjectQuery(id)
  const conversationsQuery = useProjectConversationsQuery(id)
  const currentUserQuery = useCurrentUser()

  // 位置是画布态：只给一个不重叠的初始排布，用户拖过之后以拖后为准。
  const nodes = useMemo<WorkspaceNode[]>(() => {
    if (conversationsQuery.isPending) return []
    const conversations = conversationsQuery.data ?? []
    if (conversations.length === 0) {
      // 刚建好的空间还没有任何对话：放一张占位卡（不可打开，只可拖动）。
      return [{ id: 'draft', title: '', x: NODE_ORIGIN_X, y: NODE_ORIGIN_Y }]
    }
    return conversations.map((conversation, index) => ({
      id: conversation.id,
      title: conversation.title,
      href: `/chat/${conversation.id}`,
      x: NODE_ORIGIN_X + (index % NODE_COLUMNS) * NODE_COLUMN_PX,
      y: NODE_ORIGIN_Y + Math.floor(index / NODE_COLUMNS) * NODE_ROW_PX,
    }))
  }, [conversationsQuery.data, conversationsQuery.isPending])

  const handleClose = useCallback(() => navigate('/learn-spaces'), [navigate])

  // 与项目页同一条接力路径：带 initialMessage + messageKey 进 /chat，
  // 会话直接诞生在当前空间里。
  const handleStartConversation = useCallback(
    (text: string) => {
      navigate('/chat', {
        state: {
          initialMessage: text,
          messageKey: crypto.randomUUID(),
          projectId: id,
        },
      })
    },
    [id, navigate]
  )

  // 「指挥室」：不加初始消息，只把空间身份带过去，用户到对话页再开口。
  const handleNewConversation = useCallback(
    () => navigate('/chat', { state: { projectId: id } }),
    [id, navigate]
  )

  const handleOpenNode = useCallback(
    (node: WorkspaceNode) => {
      if (node.href) navigate(node.href)
    },
    [navigate]
  )

  // 从 shelter 抽屉进一块板：编辑器路由（P0.4 实装，P0.3 先落地骨头导航）。
  const handleOpenPage = useCallback(
    (pageId: string) => {
      navigate(`/learn-spaces/${id}/docs/${pageId}`)
    },
    [id, navigate]
  )

  let errorText: string | undefined
  if (projectQuery.isError) {
    errorText = isNotFoundError(projectQuery.error)
      ? t('workspace.notFound')
      : t('workspace.loadFailed')
  } else if (conversationsQuery.isError) {
    errorText = t('workspace.loadFailed')
  }

  return (
    <LearnSpaceWorkspace
      projectId={id as string}
      spaceName={projectQuery.data?.name ?? ''}
      isNameLoading={projectQuery.isPending}
      nodes={nodes}
      errorText={errorText}
      account={currentUserQuery.data}
      onClose={handleClose}
      onStartConversation={handleStartConversation}
      onNewConversation={handleNewConversation}
      onOpenNode={handleOpenNode}
      onOpenPage={handleOpenPage}
    />
  )
}
