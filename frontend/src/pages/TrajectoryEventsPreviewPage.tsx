import { useSearchParams } from 'react-router-dom'

import { TrajectoryTimeline } from '@/features/learn-space/trajectory/TrajectoryTimeline'
import {
  TRAJECTORY_EVENTS_EMPTY,
  TRAJECTORY_EVENTS_FIXTURE,
} from '@/features/learn-space/trajectory/trajectoryFixture'

/**
 * 轨迹的**真数据版**评审入口（`/preview/trajectory-events`，免登录）。
 *
 * ⚠️ 它渲染的是**真的那一屏** `TrajectoryTimeline` —— 和真实路由
 * `/learn-spaces/:id/trajectory` 同一段代码，只是数据来自 fixture。
 * 没有这一条路由，那一屏就只能靠登录后的截图 ⇒ 等于验不了。
 *
 * ⚠️ **和隔壁 `/preview/trajectory` 不是一回事**：那一条是**旧的假数据原型**
 * （画布 + 四问 + 依据抽屉，`TrajectoryView.tsx` / `mockData.ts`），讲的是"我走了多远"；
 * 这一条讲"到底发生了什么"。两条并存是有意的，别合并。
 *
 * `?state=empty` 看空态。
 */
export function TrajectoryEventsPreviewPage() {
  const [params] = useSearchParams()
  const isEmpty = params.get('state') === 'empty'

  return (
    <TrajectoryTimeline
      spaceName={isEmpty ? '刚建的空间' : '线性代数 · 期末冲刺'}
      data={isEmpty ? TRAJECTORY_EVENTS_EMPTY : TRAJECTORY_EVENTS_FIXTURE}
      isPending={false}
      isError={false}
      backTo={null}
    />
  )
}
