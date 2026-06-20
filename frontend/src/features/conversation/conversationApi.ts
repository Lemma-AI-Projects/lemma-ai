import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import {
  conversationDetailQueryKey,
  conversationsQueryRootKey,
} from '@/lib/queryKeys'
import type { ConversationToolRef } from './types'

export interface ConversationListItem {
  id: string
  title: string
  updatedAt: string
}

export interface ConversationDetail {
  id: string
  title: string | null
  projectId: string | null
  updatedAt: string
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoningText?: string | null
  createdAt: string
  /** Tool card attached to this turn (present only on tool turns). */
  tool?: ConversationToolRef
}

/** 主侧边栏列表（仅未归属项目的会话）。 */
export const conversationsQueryKey = conversationsQueryRootKey

/**
 * 历史回填快照的 key 故意不放在 ['conversations'] 前缀下：流结束后
 * hook 按该前缀 invalidate 各列表，若快照也被失效会触发 refetch，
 * 与内存中的 liveMessages 重复渲染。
 */
export function conversationMessagesQueryKey(conversationId: string) {
  return ['conversation-messages', conversationId] as const
}

async function getConversations(): Promise<ConversationListItem[]> {
  const { data } = await signOutOn401(
    apiClient.get<ConversationListItem[]>('/api/v1/conversations', {
      params: { limit: 50, offset: 0 },
    })
  )
  return data
}

async function getConversationMessages(
  conversationId: string
): Promise<ConversationMessage[]> {
  const { data } = await signOutOn401(
    apiClient.get<ConversationMessage[]>(
      `/api/v1/conversations/${conversationId}/messages`
    )
  )
  return data
}

async function getConversationDetail(
  conversationId: string
): Promise<ConversationDetail> {
  const { data } = await signOutOn401(
    apiClient.get<ConversationDetail>(`/api/v1/conversations/${conversationId}`)
  )
  return data
}

/**
 * 会话详情（标题/归属项目）。列表缓存查不到项目内会话（主列表按设计
 * 排除它们），按 id 的标题/归属一律走这里。
 */
export function useConversationDetailQuery(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationDetailQueryKey(conversationId ?? 'none'),
    queryFn: () => getConversationDetail(conversationId as string),
    enabled: Boolean(conversationId),
    retry: retryUnlessClientError,
  })
}

/** 主侧边栏会话列表，按 updatedAt 倒序。 */
export function useConversationsQuery() {
  return useQuery({
    queryKey: conversationsQueryKey,
    queryFn: getConversations,
    retry: retryUnlessClientError,
  })
}

/**
 * 进入会话时的历史回填快照。本 session 内的增量全部走内存 liveMessages，
 * 因此快照设为永不过期；离开会话时由 useConversationChat 整体清除缓存，
 * 下次进入重新拉取。
 */
export function useConversationMessagesQuery(
  conversationId: string | undefined,
  { enabled }: { enabled: boolean }
) {
  return useQuery({
    queryKey: conversationMessagesQueryKey(conversationId ?? 'none'),
    queryFn: () => getConversationMessages(conversationId as string),
    enabled: Boolean(conversationId) && enabled,
    staleTime: Infinity,
    retry: retryUnlessClientError,
  })
}

export function useRenameConversationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { conversationId: string; title: string }) => {
      const { data } = await signOutOn401(
        apiClient.patch<ConversationListItem>(
          `/api/v1/conversations/${variables.conversationId}`,
          { title: variables.title }
        )
      )
      return data
    },
    onSuccess: (_data, variables) => {
      // 主列表与项目列表共用前缀，无论会话归属哪边都能刷新到
      void queryClient.invalidateQueries({ queryKey: conversationsQueryRootKey })
      void queryClient.invalidateQueries({
        queryKey: conversationDetailQueryKey(variables.conversationId),
      })
    },
  })
}

export function useDeleteConversationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { conversationId: string }) => {
      await signOutOn401(
        apiClient.delete(`/api/v1/conversations/${variables.conversationId}`)
      )
    },
    onSuccess: (_data, variables) => {
      queryClient.removeQueries({
        queryKey: conversationMessagesQueryKey(variables.conversationId),
      })
      queryClient.removeQueries({
        queryKey: conversationDetailQueryKey(variables.conversationId),
      })
      void queryClient.invalidateQueries({ queryKey: conversationsQueryRootKey })
    },
  })
}
