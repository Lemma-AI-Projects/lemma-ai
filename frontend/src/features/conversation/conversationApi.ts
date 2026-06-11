import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { supabase } from '@/lib/supabaseClient'

export interface ConversationListItem {
  id: string
  title: string
  updatedAt: string
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export const conversationsQueryKey = ['conversations'] as const

export function conversationMessagesQueryKey(conversationId: string) {
  return ['conversations', conversationId, 'messages'] as const
}

/** 404 统一含义「不存在或不是你的」，UI 一律当不存在处理。 */
export function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404
}

/** 4xx 不重试（401 走守卫回登录、404 当不存在），其余至多重试一次。 */
function retryUnlessClientError(failureCount: number, error: unknown) {
  if (isAxiosError(error) && error.response && error.response.status < 500) {
    return false
  }
  return failureCount < 1
}

/** token 失效时清掉本地会话，让 RequireAuth 守卫把用户带回登录页。 */
async function signOutOn401<T>(request: Promise<T>): Promise<T> {
  try {
    return await request
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      void supabase.auth.signOut()
    }
    throw error
  }
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

/** 侧边栏会话列表，按 updatedAt 倒序。 */
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
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
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
    },
  })
}
