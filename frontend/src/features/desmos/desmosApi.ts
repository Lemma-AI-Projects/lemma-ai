import { useMutation, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import type { AiGraph3DParams, AiGraphParams } from './translator'
import type { DesmosExpressionState } from './desmosTypes'

// Wire types (contract truth: backend schemas/desmos.py, camelCase).
export interface DesmosGraphData {
  id: string
  /** Which calculator renders this graph — DB truth, set by the render tool. */
  kind: '2d' | '3d'
  aiParams: AiGraphParams | AiGraph3DParams
  /** Opaque calculator state saved after user edits; null until first edit. */
  state: unknown | null
  updatedAt: string
}

export function desmosGraphQueryKey(graphId: string) {
  return ['desmos-graph', graphId] as const
}

async function getGraph(graphId: string): Promise<DesmosGraphData> {
  const { data } = await signOutOn401(
    apiClient.get<DesmosGraphData>(`/api/v1/graphs/${graphId}`)
  )
  return data
}

async function patchGraph(
  graphId: string,
  payload: { state: unknown; expressions: DesmosExpressionState[] }
): Promise<DesmosGraphData> {
  const { data } = await signOutOn401(
    apiClient.patch<DesmosGraphData>(`/api/v1/graphs/${graphId}`, payload)
  )
  return data
}

export function useDesmosGraphQuery(graphId: string) {
  return useQuery({
    queryKey: desmosGraphQueryKey(graphId),
    queryFn: () => getGraph(graphId),
    retry: retryUnlessClientError,
    // The graph is edited through the mounted calculator itself; refetching
    // under it would fight the user's in-progress edits.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

export function useSaveGraphMutation(graphId: string) {
  return useMutation({
    mutationFn: (payload: {
      state: unknown
      expressions: DesmosExpressionState[]
    }) => patchGraph(graphId, payload),
  })
}
