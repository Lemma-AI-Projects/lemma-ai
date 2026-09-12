import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { LearnSpaceWorkspace } from '@/features/learn-space/workspace/LearnSpaceWorkspace'
import type { WorkspaceNode } from '@/features/learn-space/workspace/workspaceTypes'

// 布局评审专用：不套 RequireAuth / AppLayout，不起后端也能看工作台。
// 节点是 mock 数据；点开会话/发送会走到 /chat，那里仍由登录守卫接管。
const previewNodes: WorkspaceNode[] = [
  { id: 'c1', title: '梯度下降的直觉', href: '/chat/c1', x: 40, y: 88 },
  { id: 'c2', title: '特征值与特征向量', href: '/chat/c2', x: 248, y: 88 },
  { id: 'draft', title: '', x: 456, y: 88 },
]

export function LearnSpaceWorkspacePreviewPage() {
  const navigate = useNavigate()

  const handleOpenNode = useCallback(
    (node: WorkspaceNode) => {
      if (node.href) navigate(node.href)
    },
    [navigate]
  )

  // 与真实页面同一条接力：/chat + 初始消息。预览态未登录，最终由 RequireAuth
  // 接管跳登录页 —— 所以这里验证的是「发送动作确实发生」。
  const handleStartConversation = useCallback(
    (text: string) => {
      navigate('/chat', {
        state: { initialMessage: text, messageKey: crypto.randomUUID() },
      })
    },
    [navigate]
  )

  return (
    <LearnSpaceWorkspace
      spaceName="线性代数 · 第 12 讲"
      nodes={previewNodes}
      onClose={() => navigate('/preview/learn-spaces')}
      onStartConversation={handleStartConversation}
      onNewConversation={() => navigate('/chat')}
      onOpenNode={handleOpenNode}
    />
  )
}
