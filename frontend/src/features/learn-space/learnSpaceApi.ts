import { useMutation } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { signOutOn401 } from '@/lib/apiUtils'

export interface AgentDraft {
  agentName: string
  personality: string
  teachingStyle: string
  welcomeMessage: string
}

/** Learn space onboarding v1：生成伴学 agent 草稿（不落库，纯生成）。 */
export function useAgentDraftMutation() {
  return useMutation({
    mutationFn: async (variables: { spaceName: string }): Promise<AgentDraft> => {
      const { data } = await signOutOn401(
        apiClient.post<AgentDraft>('/api/v1/learn-spaces/agent-draft', {
          spaceName: variables.spaceName,
        })
      )
      return data
    },
  })
}
