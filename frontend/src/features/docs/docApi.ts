import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import type { BlockIn, DocBlock, DocPage, PageKind } from './types'

/** 503 是「这功能没开」——一个确定状态，重试不会变。让它立刻显示原因，
 * 而不是先转两圈再报错；其余沿用通用策略。 */
function retryPagesQuery(failureCount: number, error: unknown) {
  if (isAxiosError(error) && error.response?.status === 503) {
    return false
  }
  return retryUnlessClientError(failureCount, error)
}

export const pagesQueryKey = (projectId: string) =>
  ['doc', 'pages', projectId] as const

async function listProjectPages(projectId: string): Promise<DocPage[]> {
  const { data } = await signOutOn401(
    apiClient.get<DocPage[]>('/api/v1/pages', {
      params: { projectId },
    })
  )
  return data
}

/** One learn space's pages — the shelter drawer's data source. */
export function useProjectPagesQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: pagesQueryKey(projectId ?? 'none'),
    queryFn: () => listProjectPages(projectId as string),
    enabled: Boolean(projectId),
    retry: retryPagesQuery,
  })
}

/** Turn a text file (.md/.txt) into a 「资料」 board. */
export function useImportPageMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { file: File }) => {
      const { data } = await signOutOn401(
        apiClient.post<PageBlocksResponse>('/api/v1/pages/import', variables.file, {
          params: { projectId },
          headers: {
            // 浏览器对 .md 常常给不出 MIME：显式兜一个，后端只看 charset。
            'Content-Type': variables.file.type || 'text/markdown',
            // HTTP 头只能放 latin-1，文件名走 URL 编码，后端 unquote 回来。
            'X-File-Name': encodeURIComponent(variables.file.name),
          },
        })
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pagesQueryKey(projectId) })
    },
  })
}

interface CreatePageVariables {
  title: string
  kind?: PageKind
  parentPageId?: string | null
}

export function useCreatePageMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: CreatePageVariables) => {
      const { data } = await signOutOn401(
        apiClient.post<DocPage>('/api/v1/pages', {
          projectId,
          title: variables.title,
          kind: variables.kind ?? 'note',
          parentPageId: variables.parentPageId ?? null,
        })
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pagesQueryKey(projectId) })
    },
  })
}

export function useRenamePageMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { pageId: string; title: string }) => {
      const { data } = await signOutOn401(
        apiClient.put<DocPage>(`/api/v1/pages/${variables.pageId}`, {
          title: variables.title,
        })
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pagesQueryKey(projectId) })
    },
  })
}

export function useDeletePageMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (pageId: string) => {
      await signOutOn401(apiClient.delete(`/api/v1/pages/${pageId}`))
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pagesQueryKey(projectId) })
    },
  })
}

// ---------------------------------------------------------------------------
// Blocks (editor read/write)
// ---------------------------------------------------------------------------

export const pageBlocksQueryKey = (pageId: string) =>
  ['doc', 'blocks', pageId] as const

interface PageBlocksResponse {
  id: string
  projectId: string
  title: string
  kind: string
  updatedAt: string
  blocks: DocBlock[]
}

async function getPageBlocks(pageId: string): Promise<PageBlocksResponse> {
  const { data } = await signOutOn401(
    apiClient.get<PageBlocksResponse>(`/api/v1/pages/${pageId}/blocks`)
  )
  return data
}

/** Fetch ordered blocks for a page (the editor's content source). */
export function usePageBlocksQuery(pageId: string | undefined) {
  return useQuery({
    queryKey: pageBlocksQueryKey(pageId ?? 'none'),
    queryFn: () => getPageBlocks(pageId as string),
    enabled: Boolean(pageId),
    retry: retryUnlessClientError,
  })
}

interface SaveBlocksVariables {
  pageId: string
  blocks: BlockIn[]
  updatedAt: string
}

async function savePageBlocks(
  pageId: string,
  blocks: BlockIn[],
  updatedAt: string
): Promise<PageBlocksResponse> {
  const { data } = await signOutOn401(
    apiClient.put<PageBlocksResponse>(`/api/v1/pages/${pageId}/blocks`, {
      blocks,
      updatedAt,
    })
  )
  return data
}

/** Save blocks atomically (PUT). Throws on 409 stale version. */
export function useSavePageBlocksMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pageId, blocks, updatedAt }: SaveBlocksVariables) =>
      savePageBlocks(pageId, blocks, updatedAt),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: pageBlocksQueryKey(data.id),
      })
    },
  })
}