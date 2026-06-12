import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { signOutOn401 } from '@/lib/apiUtils'
import {
  conversationDetailQueryKey,
  conversationsQueryRootKey,
} from '@/lib/queryKeys'

/**
 * 会话移入项目（projectId 为 uuid）或移出回主列表（projectId 为 null）。
 * 被 conversation 与 project 两个 feature 共用，故提升到全局 hooks。
 */
export function useMoveConversationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: {
      conversationId: string
      projectId: string | null
    }) => {
      await signOutOn401(
        apiClient.patch(`/api/v1/conversations/${variables.conversationId}`, {
          projectId: variables.projectId,
        })
      )
    },
    onSuccess: (_data, variables) => {
      // 移入/移出涉及主列表与项目列表，两者共用前缀，一并失效
      void queryClient.invalidateQueries({ queryKey: conversationsQueryRootKey })
      // 详情里的归属项目变了
      void queryClient.invalidateQueries({
        queryKey: conversationDetailQueryKey(variables.conversationId),
      })
    },
  })
}
