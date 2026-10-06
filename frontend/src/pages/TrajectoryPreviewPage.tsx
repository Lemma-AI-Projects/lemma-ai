import { TrajectoryView } from '@/features/learn-space/trajectory/TrajectoryView'

/**
 * Trajectory 的独立页面（`/preview/trajectory`）。
 *
 * 挂成 preview 是有意的，两个原因：
 *
 *  1. **它是 Learn Space 的东西，不该出现在 Free Course 里**（那两套目前相对独立）。
 *  2. **未来的入口设计是 Hover Shelter → submenu → Trajectory**。所以它必须能被
 *     一个 navigation entry 自然打开，而<strong>不改动现有的导航结构</strong> ——
 *     挂成独立路由时，未来的 Shelter submenu 只要指向同一条路径即可，
 *     不需要现在就把 submenu 建起来。
 *
 *  mock 数据，不接任何后端。真实数据接入时替换
 * `features/learn-space/trajectory/mockData.ts` 即可，组件不变。
 */
export function TrajectoryPreviewPage() {
  return <TrajectoryView />
}
