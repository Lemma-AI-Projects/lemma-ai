import { useSearchParams } from 'react-router-dom'

import { TrajectoryCanvas } from '@/features/learn-space/trajectory/TrajectoryCanvas'
import { TrajectoryTimeline } from '@/features/learn-space/trajectory/TrajectoryTimeline'
import {
  TRAJECTORY_EVENTS_EMPTY,
  TRAJECTORY_EVENTS_FIXTURE,
} from '@/features/learn-space/trajectory/trajectoryFixture'

/**
 * 轨迹的**真数据版**评审入口（`/preview/trajectory-events`，免登录）。
 *
 * ⚠️ 它渲染的是**真的那一屏** —— 和真实路由 `/learn-spaces/:id/trajectory` 同一段代码，
 * 只是数据来自 fixture。没有这一条路由，那一屏就只能靠登录后的截图 ⇒ 等于验不了。
 *
 * ⚠️ **和隔壁 `/preview/trajectory` 不是一回事**：那一条是**旧的假数据原型**
 * （画布 + 四问 + 依据抽屉，`TrajectoryView.tsx` / `mockData.ts`），讲的是"我走了多远"；
 * 这一条讲"到底发生了什么"。两条并存是有意的，别合并。
 *
 * ## 两个查询参数（**都只属于评审页，不是产品控件**）
 *
 * - `?view=canvas|list` —— 画布版 / 列表版。默认 `canvas`。留在评审页是为了能**对照**：
 *   同一份数据两种摆法并排看，才知道画布到底有没有比列表多说什么。
 *   真实路由只用画布版。
 * - `?state=empty|error` —— 看空态 / 读不到。**状态是这一屏的一等状态**，不是"还没加载"。
 */
export function TrajectoryEventsPreviewPage() {
  const [params] = useSearchParams()
  const state = params.get('state')
  const isEmpty = state === 'empty'
  const isError = state === 'error'
  const asList = params.get('view') === 'list'

  const props = {
    spaceName: isEmpty ? '刚建的空间' : '线性代数 · 期末冲刺',
    data: isEmpty ? TRAJECTORY_EVENTS_EMPTY : TRAJECTORY_EVENTS_FIXTURE,
    isPending: false,
    isError,
    backTo: null,
  }

  return asList ? <TrajectoryTimeline {...props} /> : <TrajectoryCanvas {...props} />
}
