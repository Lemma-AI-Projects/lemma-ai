import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import type { AgentContextInspector } from './types'

export const agentContextQueryKey = (
  projectId: string,
  conversationId?: string
) => ['agent', 'context', projectId, conversationId ?? 'new'] as const

async function getAgentContext(
  projectId: string,
  conversationId?: string
): Promise<AgentContextInspector> {
  const { data } = await signOutOn401(
    apiClient.get<AgentContextInspector>(
      `/api/v1/projects/${projectId}/agent-context`,
      { params: conversationId ? { conversationId } : {} }
    )
  )
  return data
}

/**
 * What the Global Agent can see for this space right now.
 *
 * The backend assembles this with the SAME code the chat turn uses, so the panel
 * cannot claim the agent sees something it does not. Passing conversationId makes
 * the preview include the history that conversation would replay.
 */
export function useAgentContextQuery(
  projectId: string | undefined,
  conversationId?: string
) {
  return useQuery({
    queryKey: agentContextQueryKey(projectId ?? 'none', conversationId),
    queryFn: () => getAgentContext(projectId as string, conversationId),
    enabled: Boolean(projectId),
    retry: retryUnlessClientError,
  })
}
