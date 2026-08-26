import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import { isNotFoundError, signOutOn401 } from '@/lib/apiUtils'

export interface BoardSnapshotData {
  projectId: string
  snapshot: Record<string, unknown>
  updatedAt: string
}

export const boardSnapshotKey = (projectId: string) =>
  ['projects', projectId, 'board', 'snapshot'] as const

async function fetchBoardSnapshot(
  projectId: string
): Promise<BoardSnapshotData> {
  const { data } = await signOutOn401(
    apiClient.get<BoardSnapshotData>(
      `/api/v1/projects/${projectId}/board/snapshot`
    )
  )
  return data
}

async function saveBoardSnapshot(
  projectId: string,
  snapshot: Record<string, unknown>
): Promise<BoardSnapshotData> {
  const { data } = await signOutOn401(
    apiClient.put<BoardSnapshotData>(
      `/api/v1/projects/${projectId}/board/snapshot`,
      { snapshot }
    )
  )
  return data
}

/** 挂载时拉取该空间的已存画板（404 = 尚无快照 → 空白画布，不重试） */
export function useBoardSnapshotQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: boardSnapshotKey(projectId ?? 'none'),
    queryFn: () => fetchBoardSnapshot(projectId as string),
    enabled: Boolean(projectId),
    retry: (failureCount, error) =>
      isNotFoundError(error) ? false : failureCount < 2,
  })
}

/** 画板快照保存（供编辑器直接调用，队列内做合并防乱序） */
export function useSaveBoardSnapshot(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (snapshot: Record<string, unknown>) =>
      saveBoardSnapshot(projectId, snapshot),
    onSuccess: (data) => {
      queryClient.setQueryData(boardSnapshotKey(projectId), data)
    },
  })
}

export { saveBoardSnapshot }