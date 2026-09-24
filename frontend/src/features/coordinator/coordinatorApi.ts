import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { knowledgeStructureQueryKey } from '@/features/learn-space/brief/briefApi'
import { notificationsQueryKey } from '@/features/notifications/notificationApi'
import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import type {
  CoordinatorDecisionRecord,
  CoordinatorEventSource,
  CoordinatorExplanation,
  EvidenceInput,
} from './types'

/**
 * The Coordinator's reads — and one write that belongs to a different layer.
 *
 * There is no "run the Coordinator" call here, because there is none in the API:
 * the Coordinator is invoked by whatever writes evidence, server-side, in the
 * same request. So this module has exactly three jobs: read the decision log,
 * dry-run a decision for display, and write a piece of evidence — the last of
 * which is `POST /knowledge/evidence`, the same door the Global Agent's tool
 * uses (the dev panel is a caller of the real write path, not a shortcut around
 * it).
 */

export function coordinatorDecisionsQueryKey(projectId: string) {
  return ['coordinator', 'decisions', projectId] as const
}

export function coordinatorExplanationQueryKey(
  projectId: string,
  itemId: string,
  source: CoordinatorEventSource
) {
  return ['coordinator', 'explain', projectId, itemId, source] as const
}

async function fetchDecisions(
  projectId: string
): Promise<CoordinatorDecisionRecord[]> {
  const { data } = await signOutOn401(
    apiClient.get<CoordinatorDecisionRecord[]>('/api/v1/coordinator/decisions', {
      params: { projectId, limit: 20 },
    })
  )
  return data
}

async function fetchExplanation(
  projectId: string,
  itemId: string,
  source: CoordinatorEventSource
): Promise<CoordinatorExplanation> {
  const { data } = await signOutOn401(
    apiClient.get<CoordinatorExplanation>('/api/v1/coordinator/explain', {
      params: { projectId, itemId, source },
    })
  )
  return data
}

/** One space's decision log, newest first. */
export function useCoordinatorDecisionsQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: coordinatorDecisionsQueryKey(projectId ?? 'none'),
    queryFn: () => fetchDecisions(projectId as string),
    enabled: Boolean(projectId),
    retry: retryUnlessClientError,
  })
}

/**
 * The dry run, for display. `staleTime: 0` because it is a question about *now*:
 * it must be re-asked whenever the state it reads might have changed, and the
 * write below invalidates it.
 */
export function useCoordinatorExplanationQuery(
  projectId: string | undefined,
  itemId: string | undefined,
  source: CoordinatorEventSource
) {
  return useQuery({
    queryKey: coordinatorExplanationQueryKey(
      projectId ?? 'none',
      itemId ?? 'none',
      source
    ),
    queryFn: () => fetchExplanation(projectId as string, itemId as string, source),
    enabled: Boolean(projectId) && Boolean(itemId),
    retry: retryUnlessClientError,
    staleTime: 0,
    throwOnError: false,
  })
}

async function postEvidence(input: EvidenceInput): Promise<void> {
  await signOutOn401(
    apiClient.post('/api/v1/knowledge/evidence', {
      projectId: input.projectId,
      itemId: input.itemId,
      verdict: input.verdict,
      tier: input.tier,
      // Tier B is rubric-judged and MUST carry its reason (the service refuses an
      // unreviewable judgement), so the dev panel states that it is a dev record.
      reasoning: input.reasoning,
    })
  )
}

/**
 * Write one piece of evidence — the real one, through the real door.
 *
 * On success three things are now stale and all three are refetched: the state
 * (the structure), the decision the write produced (the log), and the feed (a
 * NOTIFY decision lands there).
 */
export function useRecordEvidenceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EvidenceInput) => postEvidence(input),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({
        queryKey: knowledgeStructureQueryKey(input.projectId),
      })
      void queryClient.invalidateQueries({
        queryKey: coordinatorDecisionsQueryKey(input.projectId),
      })
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['coordinator', 'explain'] })
    },
  })
}
