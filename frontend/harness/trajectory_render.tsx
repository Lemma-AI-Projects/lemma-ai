/**
 * Offscreen-render harness for Trajectory —— NOT application code.
 *
 * Renders the **real** `TrajectoryView` (the same component the route mounts)
 * through the same provider graph the app uses, so what this asserts is what a
 * reviewer sees at `/preview/trajectory`.
 *
 * Three things are worth rendering separately, and the reason is the design
 * claim rather than the code: Trajectory says a **change** is the unit, not an
 * activity. So the states that matter are
 *
 *   1. a space with a breakthrough / problem / artifact mix — the default TOEFL one;
 *   2. the one whose trajectory is artifact-driven (philosophy) — where the claim
 *      "a change can be a change in a *work*" has to hold;
 *   3. the empty-evidence case — a node with no grounding must **say so** rather
 *      than render an empty "0 条依据" that reads like a loading bug.
 *
 * Provider rule (same as the other harnesses): QueryClientProvider must come from
 * the project's own module graph, so this file lives inside it and a `.mjs` script
 * only loads it through `ssrLoadModule`. Not imported by the app.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

import { TRAJECTORY_SPACES } from '@/features/learn-space/trajectory/mockData'
import { TrajectoryView } from '@/features/learn-space/trajectory/TrajectoryView'

function Providers({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
    },
  })
  // 预览模式不连后端；Trajectory 本身不发请求，但 useState 之外的组件仍要一个
  // QueryClient 才不会抛 "No QueryClient set"（Sheet 的 portal 链路会用到）。
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

/** 默认空间：目标驱动 + 有一次三周中断 + 回来。 */
export function TrajectoryRenderHarness() {
  return (
    <Providers>
      <TrajectoryView />
    </Providers>
  )
}

/**
 * 产物驱动的那一个（哲学论文）。
 *
 * 单独渲染它是为了让断言能问到一句设计声称：<strong>「一次改变可以是一次作品的
 * 变化」</strong>—— 如果 artifact 类型在版式上与其它类型没有区别，那句话就是假的。
 */
export function TrajectoryArtifactHarness() {
  return (
    <Providers>
      <TrajectoryView defaultSpaceId="philosophy" />
    </Providers>
  )
}

/**
 * 没有依据的节点 —— Trajectory 里最要紧的一种状态。
 *
 * 一个没有证据支撑的判断**仍然应该被显示**，只是要显出它没有支撑。
 * 所以这个 harness 渲染的是一个「有节点但 evidence 为空」的空间。
 */
export function TrajectoryNoEvidenceHarness() {
  return (
    <Providers>
      <TrajectoryView spaceOverride={{ ...TRAJECTORY_SPACES[0], nodes: UNGROUNDED_NODES }} />
    </Providers>
  )
}

/** 一条只有判断、没有依据的 node。 */
const UNGROUNDED_NODES = [
  {
    id: 'x1',
    kind: 'episode' as const,
    date: 'Sep 14',
    title: '一次没有留下痕迹的练习',
    whatHappened: '你做了一组题，答得还可以，但没有任何一次被单独记下来。',
    whatChanged: '（没有可判断的变化 —— 记录里没有任何东西支持「变了」这个说法。）',
    evidence: [],
    whatRemains: '这次练习是否有用，现在无法回答。',
    implication:
      '这一条在页面上必须看起来和别的节点一样重 —— 否则「没有依据」会被读成「不重要」。',
    relatedFocus: '未记录',
  },
]
