import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import type { BlockIn, DocBlock, DocPage, PageKind } from './types'

export const pagesQueryKey = (projectId: string) =>
  ['doc', 'pages', projectId] as const

export const pageDetailQueryKey = (pageId: string) =>
  ['doc', 'page', pageId] as const

async function getPage(pageId: string): Promise<DocPage> {
  const { data } = await signOutOn401(
    apiClient.get<DocPage>(`/api/v1/pages/${pageId}`)
  )
  return data
}

/** Single page (title/kind) — the editor stub reads this on entry. */
export function usePageQuery(pageId: string | undefined) {
  return useQuery({
    queryKey: pageDetailQueryKey(pageId ?? 'none'),
    queryFn: () => getPage(pageId as string),
    enabled: Boolean(pageId),
    retry: retryUnlessClientError,
  })
}

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
    // 4xx 不重试（503 门控关闭同理——把它当「无板块」的空态，而非反复打）。
    retry: retryUnlessClientError,
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