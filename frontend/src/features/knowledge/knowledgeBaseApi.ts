import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { signOutOn401 } from '@/lib/apiUtils'

/** 笔记树节点（kb-engine /kb/notes/tree 返回结构） */
export interface KbTreeNode {
  branchId: string
  noteId: string
  title: string
  type: string
  children: KbTreeNode[]
}

export interface NotesTreeResponse {
  tree: KbTreeNode[]
}

export const notesTreeQueryKey = ['kb', 'notes-tree'] as const

/**
 * 真实笔记树（Trilium 引擎，经 FastAPI 网关 /api/v1/kb/notes/tree）。
 * 失败/未配置（kb_engine_url 空 → 网关 503）时返回空树——知识库页其余
 * 内容不受影响（fail-open，韧性原则）。
 */
export function useNotesTree() {
  return useQuery({
    queryKey: notesTreeQueryKey,
    queryFn: async (): Promise<KbTreeNode[]> => {
      const { data } = await signOutOn401(
        apiClient.get<NotesTreeResponse>('/api/v1/kb/notes/tree')
      )
      return data?.tree ?? []
    },
    retry: false,
    staleTime: 30_000,
  })
}
