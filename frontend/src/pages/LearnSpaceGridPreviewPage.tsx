import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { pagesQueryKey } from '@/features/docs/docApi'
import type { DocPage } from '@/features/docs/types'
import { LearnSpaceWorkspace } from '@/features/learn-space/workspace/LearnSpaceWorkspace'

// 布局评审专用：不套 RequireAuth / AppLayout，直接喂 mock 数据，不起后端、不登录
// 即可查看网格模式（分组 + 卡片 + 顶栏的「编辑」与「视角」两个入口）。
// 与 /preview/schedule 同一套做法：预置 query 缓存 + staleTime: Infinity，
// 所以它不会去请求真接口，页面渲染的就是 fixtures。
//
// 评审的是「网格长什么样」，不是上传链路 —— 上传由
// tests/api/test_page_materials_api.py 负责。
const PROJECT_ID = 'preview-space'

const previewQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
  },
})

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()

function page(overrides: Partial<DocPage>): DocPage {
  return {
    id: 'p',
    projectId: PROJECT_ID,
    projectName: '线性代数 · 期末冲刺',
    parentPageId: null,
    title: '未命名',
    kind: 'imported',
    source: 'upload',
    importRef: null,
    originalName: null,
    mime: null,
    updatedAt: new Date(now - DAY).toISOString(),
    ...overrides,
  }
}

previewQueryClient.setQueryData(pagesQueryKey(PROJECT_ID), [
  page({
    id: 'pdf-1',
    title: '线性代数讲义',
    originalName: '线性代数讲义.pdf',
    mime: 'application/pdf',
    updatedAt: new Date(now - DAY).toISOString(),
  }),
  page({
    id: 'pdf-2',
    title: '期末考试真题',
    originalName: '2025期末真题.pdf',
    mime: 'application/pdf',
    source: 'manual',
    updatedAt: new Date(now - 3 * DAY).toISOString(),
  }),
  page({
    id: 'img-1',
    title: '课堂白板照片',
    originalName: 'IMG_2031.png',
    mime: 'image/png',
    updatedAt: new Date(now - 2 * DAY).toISOString(),
  }),
  page({
    id: 'sheet-1',
    title: '错题统计',
    originalName: '错题统计.xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    updatedAt: new Date(now - 5 * DAY).toISOString(),
  }),
  page({
    id: 'deck-1',
    title: '第 3 讲讲稿',
    originalName: '第3讲讲稿.pptx',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    updatedAt: new Date(now - 6 * DAY).toISOString(),
  }),
  page({
    id: 'note-1',
    title: '复习笔记：特征值',
    kind: 'note',
    source: 'manual',
    updatedAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
  }),
  page({
    id: 'canvas-1',
    title: '推导草稿',
    kind: 'canvas',
    source: 'manual',
    updatedAt: new Date(now - 8 * DAY).toISOString(),
  }),
  page({
    id: 'folder-1',
    title: '课程材料',
    kind: 'folder',
    source: 'manual',
    updatedAt: new Date(now - 9 * DAY).toISOString(),
  }),
])

export function LearnSpaceGridPreviewPage() {
  return (
    <QueryClientProvider client={previewQueryClient}>
      <LearnSpaceWorkspace
        projectId={PROJECT_ID}
        spaceName="线性代数 · 期末冲刺"
        nodes={[]}
        onClose={() => {}}
        onNewConversation={() => {}}
        onOpenNode={() => {}}
        onOpenPage={() => {}}
      />
    </QueryClientProvider>
  )
}
