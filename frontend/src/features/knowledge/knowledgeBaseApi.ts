import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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

// ── K4：写路径 + 搜索（走网关透传 /api/v1/kb/api/* → 侧车 /kb/api/*） ────────
// URL/参数构建抽纯函数（K4 验收：可单测，不含 react/axios 依赖）。

/** 引擎 createNote 返回（K2 验证：{ note, branch } 嵌套） */
export interface KbCreateNoteResult {
  note: { noteId: string; title: string; type: string }
  branch?: { branchId: string }
}

/** 引擎 quick-search 返回 */
export interface KbSearchResult {
  notePath: string
  noteTitle: string
  contentSnippet: string | null
}

export interface KbSearchResponse {
  searchResultNoteIds: string[]
  searchResults: KbSearchResult[]
  error: string | null
}

/** 新建笔记：POST /notes/:parentNoteId/children?target=into（body: title/type/content） */
export function buildCreateNotePath(parentNoteId: string): string {
  return `/api/v1/kb/api/notes/${encodeURIComponent(parentNoteId)}/children?target=into`
}

/** 改名：PUT /notes/:noteId/title（body: { title }） */
export function buildChangeTitlePath(noteId: string): string {
  return `/api/v1/kb/api/notes/${encodeURIComponent(noteId)}/title`
}

/**
 * 删除：DELETE /notes/:noteId?taskId=<随机>——引擎 deleteNote 校验 taskId
 * （TaskContext 批量删除追踪），缺失必 400（F3）。
 */
export function buildDeleteNotePath(noteId: string, taskId: string): string {
  return `/api/v1/kb/api/notes/${encodeURIComponent(noteId)}?taskId=${encodeURIComponent(taskId)}`
}

export function randomTaskId(): string {
  return Math.random().toString(36).slice(2, 12)
}

/** 快速搜索：GET /quick-search/:searchString（普通文本模糊） */
export function buildQuickSearchPath(searchString: string): string {
  return `/api/v1/kb/api/quick-search/${encodeURIComponent(searchString)}`
}

export const quickSearchQueryKey = ['kb', 'quick-search'] as const

/**
 * 在指定笔记下新建（K4.2 树面板「+」用；成功刷新树）。
 * parentNoteId 放 variables（组件层不按节点拆 hook，避免条件调用）。
 */
export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      parentNoteId: string
      title: string
      type?: string
      content?: string
    }): Promise<KbCreateNoteResult> => {
      const { data } = await signOutOn401(
        apiClient.post<KbCreateNoteResult>(
          buildCreateNotePath(vars.parentNoteId),
          {
            title: vars.title,
            type: vars.type ?? 'text',
            content: vars.content ?? '',
          }
        )
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notesTreeQueryKey })
    },
  })
}

/** 改名（K4.2 inline 编辑用；成功刷新树） */
export function useChangeTitle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { noteId: string; title: string }) => {
      await signOutOn401(
        apiClient.put(buildChangeTitlePath(vars.noteId), {
          title: vars.title,
        })
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notesTreeQueryKey })
    },
  })
}

/** 删除（K4.2 删除确认用；taskId 随机串满足引擎校验，成功刷新树） */
export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { noteId: string }) => {
      await signOutOn401(
        apiClient.delete(buildDeleteNotePath(vars.noteId, randomTaskId()))
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notesTreeQueryKey })
    },
  })
}

/**
 * 快速搜索（K4.3 搜索框用；enabled 控制是否请求——空串/门控关时不发）。
 * 502（侧车门控关）→ error 状态，组件 fail-open 提示。
 */
export function useQuickSearch(searchString: string, enabled: boolean) {
  return useQuery({
    queryKey: [...quickSearchQueryKey, searchString],
    queryFn: async (): Promise<KbSearchResponse | null> => {
      const { data } = await signOutOn401(
        apiClient.get<KbSearchResponse>(
          buildQuickSearchPath(searchString.trim())
        )
      )
      return data
    },
    enabled: enabled && searchString.trim().length > 0,
    retry: false,
    staleTime: 0,
  })
}
