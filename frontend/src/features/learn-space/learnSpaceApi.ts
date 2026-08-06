import { useMutation } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { signOutOn401 } from '@/lib/apiUtils'

export interface AgentDraft {
  agentName: string
  personality: string
  teachingStyle: string
  welcomeMessage: string
}

/** 生成伴学 agent 草稿（不落库）。可选偏好（名字/性格/教学风格）引导生成。 */
export function useAgentDraftMutation() {
  return useMutation({
    mutationFn: async (variables: {
      spaceName: string
      agentName?: string
      personality?: string
      teachingStyle?: string
    }): Promise<AgentDraft> => {
      const { data } = await signOutOn401(
        apiClient.post<AgentDraft>('/api/v1/learn-spaces/agent-draft', {
          spaceName: variables.spaceName,
          ...(variables.agentName ? { agentName: variables.agentName } : {}),
          ...(variables.personality ? { personality: variables.personality } : {}),
          ...(variables.teachingStyle
            ? { teachingStyle: variables.teachingStyle }
            : {}),
        })
      )
      return data
    },
  })
}
