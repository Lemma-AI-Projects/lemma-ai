import { UserTrajectoryView } from '@/features/user-trajectory/UserTrajectoryView'

/**
 * User Trajectory 低保真原型 —— `/preview/user-trajectory`。
 *
 * 挂成 preview 而不是产品路由，原因和 `/preview/trajectory` 一样：
 * 它现在要评审的是**信息架构与交互**，不是上线一个功能。
 * 与那两条旧入口的关系：
 * - `/preview/trajectory`：旧原型，讲"我走了多远"，只有一条时间轴；
 * - `/preview/trajectory-events`：真数据时间线，讲"到底发生了什么"；
 * - **本条**：一个信息空间的四个视角（概览/时间轴/探索/理解），演示发现、层级事件、
 *   四态解释、临时集合。三条并存是有意的，不许合并 —— 它们验的不是同一件事。
 *
 * 数据来自 `docs/research/user-trajectory-lab/`（合成数据，虚构用户），
 * 由 `docs/research/user-trajectory-lab/tools/build-prototype-data.mjs` 抽取成
 * `features/user-trajectory/data/dataset.generated.ts`，文字未改。
 *
 * ⚠️ 不接后端、不写任何东西：所有回应、集合、对比都只活在这个页面的 state 里。
 */
export function UserTrajectoryPreviewPage() {
  return <UserTrajectoryView />
}
