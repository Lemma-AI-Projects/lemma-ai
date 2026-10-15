import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'

/**
 * 轨迹（Trajectory）的取数。
 *
 * ⚠️ **这里是只读的，而且没有"生成"这个动作。** 轨迹不是算出来的东西 ——
 * 后端把几张表里真实存在的行读出来摆成时间顺序，所以空间一变，下一次取自然不一样。
 * 因此这里没有 mutation、没有轮询、没有"重新分析"按钮。
 */

/** 事件类型。九种，每种对应一张表里的一行（见后端 `services/trajectory_service.py`）。 */
export type TrajectoryKind =
  | 'material'
  | 'annotation'
  | 'goal'
  | 'memory'
  | 'conversation'
  | 'evidence'
  | 'bundle'
  | 'decision'
  | 'notification'

export interface TrajectoryEvent {
  id: string
  kind: TrajectoryKind
  at: string
  /**
   * `approx` = 表里没有时间戳，这是它邻居的时间（目前只有边注：块没有时间戳，
   * 取的是它所在页的更新时间）。**界面上必须看得见这个区别。**
   */
  atAccuracy: 'exact' | 'approx'
  title: string
  /** 这条是从哪一行来的 —— 依据本身。 */
  source: { table: string; id: string }
  /** 点回原处。`null` = 没有可去的地方（不是坏链接）。 */
  href: string | null
}

export interface TrajectoryResponse {
  spaceId: string
  span: { fromAt: string | null; toAt: string | null }
  events: TrajectoryEvent[]
  /** 归不到这个空间、但确实发生了的东西（按来源计数）。 */
  unattributed: Record<string, number>
  truncated: boolean
}

export const trajectoryQueryKey = (projectId: string) =>
  ['trajectory', projectId] as const

async function getTrajectory(projectId: string): Promise<TrajectoryResponse> {
  const { data } = await signOutOn401(
    apiClient.get<TrajectoryResponse>(`/api/v1/projects/${projectId}/trajectory`)
  )
  return data
}

export function useTrajectoryQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: trajectoryQueryKey(projectId ?? 'none'),
    queryFn: () => getTrajectory(projectId as string),
    enabled: Boolean(projectId),
    retry: retryUnlessClientError,
  })
}
