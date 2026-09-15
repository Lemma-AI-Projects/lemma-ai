import { useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { ImportDialog } from '@/features/docs/import/ImportDialog'
import type { LearningBriefNextStep } from '@/features/learn-space/brief/types'
import { LearnSpaceWorkspace } from '@/features/learn-space/workspace/LearnSpaceWorkspace'
import type { WorkspaceNode } from '@/features/learn-space/workspace/workspaceTypes'
import {
  DEFAULT_BRIEF_VARIANT,
  isLearningBriefVariant,
  learningBriefMocks,
} from '@/mock/learningBrief'
import { importSpaces, treeForSource } from '@/mock/importFlow'

// 布局评审专用：不套 RequireAuth / AppLayout，不起后端也能看工作台。
// 节点是 mock 数据；点开会话/发送会走到 /chat，那里仍由登录守卫接管。
//
// 参数：
//   ?variant=thick|inferred|thin   Learning Brief 的三种处境
//   ?dialog=import                 直接打开导入向导（否则走 ≡ → 导入 两下）
const PREVIEW_SPACE_ID = 'preview'

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

  const [isImportOpen, setIsImportOpen] = useState(
    () => searchParams.get('dialog') === 'import'
  )

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
    <>
      <LearnSpaceWorkspace
        projectId={PREVIEW_SPACE_ID}
        spaceName={brief.spaceName}
        nodes={previewNodes}
        brief={brief}
        onOpenBriefStep={handleOpenBriefStep}
        onClose={() => navigate('/preview/learn-spaces')}
        onStartConversation={handleStartConversation}
        onNewConversation={() => navigate('/chat')}
        onOpenNode={handleOpenNode}
        // 预览态未登录，抽屉取不到数据 → 空态；不开编辑器路由。
        onOpenPage={() => {}}
        onImport={() => setIsImportOpen(true)}
      />

      {/* 导入向导的数据全是 mock（来源目录树、空间列表），别把「导入完成」当真。 */}
      <span className="fixed top-2 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-900/85 px-3 py-1 text-[11px] text-white">
        预览 · 导入流程用的是 mock 数据
      </span>

      <ImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        currentSpaceId={PREVIEW_SPACE_ID}
        spaces={importSpaces}
        treeForSource={treeForSource}
      />
    </>
  )
}
