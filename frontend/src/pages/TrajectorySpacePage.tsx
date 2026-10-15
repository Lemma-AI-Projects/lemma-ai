import { useParams } from 'react-router-dom'

import { useProjectQuery } from '@/features/project/projectApi'
import { TrajectoryTimeline } from '@/features/learn-space/trajectory/TrajectoryTimeline'
import { useTrajectoryQuery } from '@/features/learn-space/trajectory/trajectoryApi'

/**
 * 轨迹（Trajectory）的真实路由页 —— **只做取数**，画由 `TrajectoryTimeline` 负责。
 *
 * 拆成两层是**为了能被验**：这一层要 token（本机没有），那一层只收 props，
 * 所以 `/preview/trajectory-events` 能用同一段代码渲染给大家看。
 *
 * ⚠️ 这里是只读的：没有"生成"、没有"重新分析"、没有轮询。
 * 轨迹不是算出来的，是读出来的 —— 空间一变，下一次打开自然不一样。
 */
export function TrajectorySpacePage() {
  const { id } = useParams<{ id: string }>()
  const projectQuery = useProjectQuery(id)
  const trajectoryQuery = useTrajectoryQuery(id)

  return (
    <TrajectoryTimeline
      spaceName={projectQuery.data?.name ?? ''}
      data={trajectoryQuery.data}
      isPending={trajectoryQuery.isPending}
      isError={trajectoryQuery.isError}
      backTo={`/learn-spaces/${id}`}
    />
  )
}
