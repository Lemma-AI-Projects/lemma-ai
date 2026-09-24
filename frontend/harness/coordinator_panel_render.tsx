/**
 * Offscreen-render harness for the Coordinator dev panel — NOT application code.
 *
 * It is not imported by the app and not routed: the only consumer is
 * `.workbuddy/localdb/render_notifications.mjs`, which renders it through Vite's
 * SSR loader so the panel's `useQuery` and this file's `QueryClientProvider` come
 * from the SAME module instance (loading react-query from outside the module
 * graph gives a second instance and the panel throws "No QueryClient set").
 *
 * It sits outside `src/` on purpose: it is scaffolding for verification, not a
 * page, and `tsconfig` does not type-check it as part of the app.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { CoordinatorPanel } from '@/features/coordinator/CoordinatorPanel'
import {
  coordinatorDecisionsQueryKey,
  coordinatorExplanationQueryKey,
} from '@/features/coordinator/coordinatorApi'
import { knowledgeStructureQueryKey } from '@/features/learn-space/brief/briefApi'
import { projectsQueryKey } from '@/features/project/projectApi'

const SPACE = 'coord-space'
const ITEM = 'coord-item'

const client = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
  },
})

client.setQueryData(projectsQueryKey, [
  { id: SPACE, name: '线性代数 · 第 12 讲', updatedAt: new Date().toISOString() },
])
client.setQueryData(knowledgeStructureQueryKey(SPACE), {
  projectId: SPACE,
  items: [
    {
      id: ITEM,
      label: '线性无关',
      kind: 'concept',
      origin: 'agent_drafted',
      status: 'active',
    },
  ],
  edges: [],
  states: [],
  outerFringe: [],
  innerFringe: [],
  violations: [],
  overriddenIds: [],
  ignoredEvidence: 0,
})
client.setQueryData(coordinatorExplanationQueryKey(SPACE, ITEM, 'api'), {
  snapshot: {
    event: { type: 'learner_state.updated', payload: {}, source: 'api' },
    currentTime: new Date().toISOString(),
    spaceId: SPACE,
    focus: {
      id: ITEM,
      label: '线性无关',
      value: 'mastered',
      origin: 'observed',
      evidenceCount: 1,
      lastConfirmedAt: new Date().toISOString(),
      previousValue: 'unassessed',
    },
    mastered: ['矩阵基础', '线性无关'],
    ready: ['特征值'],
    developing: [],
    unassessedCount: 1,
    recentEvidence: [],
    recentMemory: [],
    availableActions: ['NO_ACTION', 'CONTINUE', 'REVIEW', 'INTRODUCE', 'NOTIFY'],
    goal: null,
  },
  decision: {
    action: 'NOTIFY',
    target: '特征值',
    reason: '「线性无关」已经具备，而「特征值」的前提都已满足 —— 可以开始学它。',
    urgency: 'normal',
    payload: { finding: 'next_step' },
  },
})
client.setQueryData(coordinatorDecisionsQueryKey(SPACE), [
  {
    id: 'd1',
    projectId: SPACE,
    eventType: 'learner_state.updated',
    eventPayload: { itemLabel: '线性无关', verdict: 'correct' },
    action: 'NOTIFY',
    target: '特征值',
    reason: '「线性无关」已经具备，而「特征值」的前提都已满足 —— 可以开始学它。',
    urgency: 'normal',
    effect: 'notification_sent:8f2a',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'd2',
    projectId: SPACE,
    eventType: 'learner_state.updated',
    eventPayload: { itemLabel: '线性无关', verdict: 'incorrect' },
    action: 'REVIEW',
    target: '线性无关',
    reason: '「线性无关」此前做对过，这一次没做出来 —— 值得回头再确认一次。',
    urgency: 'high',
    effect: 'handed_to_global_agent',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'd3',
    projectId: SPACE,
    eventType: 'learner_state.updated',
    eventPayload: { itemLabel: '特征值', verdict: 'correct' },
    action: 'NO_ACTION',
    target: '特征值',
    reason: '「特征值」这次只记到一条判定，还没定案 —— 现在不构成行动。',
    urgency: 'low',
    effect: 'nothing_to_do',
    createdAt: new Date().toISOString(),
  },
])

export function CoordinatorRenderHarness() {
  return (
    <QueryClientProvider client={client}>
      <div className="w-80 bg-zinc-100 p-2">
        <CoordinatorPanel defaultOpen />
      </div>
    </QueryClientProvider>
  )
}
