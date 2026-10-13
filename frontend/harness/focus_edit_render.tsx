/**
 * Offscreen-render harness for 聚焦里的 `edit`（M4）—— NOT application code.
 *
 * 它渲染的是**真的 `FocusView`，而且是非预览那一支**（挂在真路由上，`useParams`
 * 拿得到空间 id）。这一点是关键：`edit` 三个入口与左栏的重命名/删除，只有
 * `FocusView` 把它们**接上去**才有意义 —— 只测 `FocusTopBar` 收不收得到 prop，
 * 证明不了"页面上真的有"。所以这里喂一份**预置的** pages / blocks（react-query
 * 的缓存直接塞进去），让非预览的聚焦页在离屏环境下也能长出左栏资料列表。
 *
 * 上传件在这里不出现：这一组只证明"入口在"，落盘那一跑（真的新建一份笔记、真的
 * 落进当前空间）需要登录态，属于 M6。
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { AuthProvider } from '@/features/auth/AuthProvider'
import { pageBlocksQueryKey, pagesQueryKey } from '@/features/docs/docApi'
import type { DocBlock, DocPage } from '@/features/docs/types'
import { FocusView } from '@/features/learn-space/focus/FocusView'

const SPACE_ID = 'space-1'

const PAGES: DocPage[] = [
  {
    id: 'p-1',
    projectId: SPACE_ID,
    projectName: '期末冲刺',
    parentPageId: null,
    title: '笔记 · 向量',
    kind: 'note',
    source: 'manual',
    importRef: null,
    originalName: null,
    mime: null,
    updatedAt: '2026-10-12T10:00:00Z',
  },
  {
    id: 'p-2',
    projectId: SPACE_ID,
    projectName: '期末冲刺',
    parentPageId: null,
    title: '讲义 · 特征值',
    kind: 'imported',
    source: 'manual',
    importRef: null,
    originalName: null,
    mime: null,
    updatedAt: '2026-10-11T10:00:00Z',
  },
]

const BLOCKS: DocBlock[] = [
  { id: 'b-1', type: 'heading', position: 0, content: { text: '向量' } },
]

function Providers({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
    },
  })
  // 预置缓存：非预览的聚焦页本来要靠 `/api/v1/pages` 才有左栏，这里直接塞进去，
  // 免得离屏环境下去打后端（会 401）。
  client.setQueryData(pagesQueryKey(SPACE_ID), PAGES)
  client.setQueryData(pageBlocksQueryKey('p-1'), {
    id: 'p-1',
    projectId: SPACE_ID,
    title: '笔记 · 向量',
    kind: 'note',
    updatedAt: '2026-10-12T10:00:00Z',
    blocks: BLOCKS,
  })

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/learn-spaces/${SPACE_ID}/docs/p-1`]}>
          <Routes>
            <Route path="/learn-spaces/:id/docs/:pageId" element={children} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export function FocusEditRenderHarness() {
  return (
    <Providers>
      <FocusView />
    </Providers>
  )
}