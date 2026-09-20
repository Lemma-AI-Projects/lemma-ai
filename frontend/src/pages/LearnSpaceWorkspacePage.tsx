import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useCurrentUser } from '@/features/auth/useCurrentUser'
import { useLearningBriefQuery } from '@/features/learn-space/brief/briefApi'
import type { LearningBriefNextStep } from '@/features/learn-space/brief/types'
import { LearnSpaceWorkspace } from '@/features/learn-space/workspace/LearnSpaceWorkspace'
import type { WorkspaceNode } from '@/features/learn-space/workspace/workspaceTypes'
import {
  useProjectConversationsQuery,
  useProjectQuery,
} from '@/features/project/projectApi'
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
  const projectQuery = useProjectQuery(id)
  const conversationsQuery = useProjectConversationsQuery(id)
  const currentUserQuery = useCurrentUser()
  // 「我学到哪了」——后端从知识结构派生，没有模型调用。
  const {
    brief,
    refresh: refreshBrief,
    isRefreshing: isBriefRefreshing,
  } = useLearningBriefQuery(id)

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

  // 「接下来」的一步：有课节就进课；没有课节（V1 全部如此）就在本空间开一段
  // 对话，预填后端给的那句话 —— 那句话本身是可验证的事实，不是模型编的建议。
  const handleOpenBriefStep = useCallback(
    (step: LearningBriefNextStep) => {
      if (step.href) {
        navigate(step.href)
        return
      }
      handleStartConversation(step.prompt ?? `讲讲「${step.title}」`)
    },
    [handleStartConversation, navigate]
  )

  let errorText: string | undefined
  if (projectQuery.isError) {
    errorText = isNotFoundError(projectQuery.error)
      ? '空间不存在或已删除'
      : '空间加载失败'
  } else if (conversationsQuery.isError) {
    errorText = '空间加载失败'
  }

  return (
    <LearnSpaceWorkspace
      spaceName={projectQuery.data?.name ?? ''}
      isNameLoading={projectQuery.isPending}
      nodes={nodes}
      errorText={errorText}
      account={currentUserQuery.data}
      onClose={handleClose}
      onStartConversation={handleStartConversation}
      onNewConversation={handleNewConversation}
      onOpenNode={handleOpenNode}
      brief={brief}
      onOpenBriefStep={handleOpenBriefStep}
      onRefreshBrief={refreshBrief}
      isBriefRefreshing={isBriefRefreshing}
    />
  )
}
