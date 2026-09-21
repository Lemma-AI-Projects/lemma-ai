import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import type { LearningBriefNextStep } from '@/features/learn-space/brief/types'
import { LearnSpaceWorkspace } from '@/features/learn-space/workspace/LearnSpaceWorkspace'
import type { WorkspaceNode } from '@/features/learn-space/workspace/workspaceTypes'
import {
  DEFAULT_BRIEF_VARIANT,
  isLearningBriefVariant,
  learningBriefMocks,
} from '@/mock/learningBrief'

// 布局评审专用：不套 RequireAuth / AppLayout，不起后端也能看工作台。
// 节点是 mock 数据；点开会话/发送会走到 /chat，那里仍由登录守卫接管。
//
// 参数：
//   ?variant=thick|inferred|thin   Learning Brief 的三种处境

const previewNodes: WorkspaceNode[] = [
  { id: 'c1', title: '梯度下降的直觉', href: '/chat/c1', x: 40, y: 88 },
  { id: 'c2', title: '特征值与特征向量', href: '/chat/c2', x: 248, y: 88 },
  { id: 'draft', title: '', x: 456, y: 88 },
]

export function LearnSpaceWorkspacePreviewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const variantParam = searchParams.get('variant')
  const variant = isLearningBriefVariant(variantParam)
    ? variantParam
    : DEFAULT_BRIEF_VARIANT
  const brief = learningBriefMocks[variant]

  const handleOpenNode = useCallback(
    (node: WorkspaceNode) => {
      if (node.href) navigate(node.href)
    },
    [navigate]
  )

  // 「接下来」的两种落点：有课节直接进课；没有对应课节的建议在当前空间开一段对话。
  const handleOpenBriefStep = useCallback(
    (step: LearningBriefNextStep) => {
      if (step.href) {
        navigate(step.href)
        return
      }
      if (step.prompt) {
        navigate('/chat', {
          state: {
            initialMessage: step.prompt,
            messageKey: crypto.randomUUID(),
            projectId: brief.projectId,
          },
        })
      }
    },
    [brief.projectId, navigate]
  )

  return (
    <LearnSpaceWorkspace
      spaceName={brief.spaceName}
      nodes={previewNodes}
      brief={brief}
      onOpenBriefStep={handleOpenBriefStep}
      onClose={() => navigate('/preview/learn-spaces')}
      onNewConversation={() => navigate('/chat')}
      onOpenNode={handleOpenNode}
    />
  )
}
