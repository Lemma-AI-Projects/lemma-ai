/**
 * Offscreen-render harness for the course page and the session outline — NOT
 * application code.
 *
 * It is not imported by the app and not routed: the only consumer is
 * `.workbuddy/localdb/render_free_course_page.mjs`, which renders it through
 * Vite's SSR loader so the components and their `useQuery` share one module
 * instance (loading react-query from outside the module graph hands back a
 * second instance, and the provider is then not the one `useQuery` reads).
 *
 * It sits outside `src/` on purpose: scaffolding for verification, not a page,
 * and `tsc` does not type-check it as part of the app.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { FreeCourseDetailView } from '@/features/free-course/FreeCourseDetailView'
import { SessionOutline } from '@/features/free-course/session/SessionOutline'
import { freeCourseDetailQueryKey } from '@/features/free-course/freeCourseApi'
import type {
  FreeCourseDetail,
  TeachingStep,
} from '@/features/free-course/types'

const COURSE: FreeCourseDetail = {
  id: 'course-1',
  mode: 'free',
  status: 'ready',
  title: '理解梯度下降：从直觉到发散',
  topic: 'gradient descent',
  audience: '有一点微积分基础的人',
  summary: '从"站在山坡上该往哪走"出发，走到学习率为什么会把模型炸掉。',
  intent: { level: '入门', goal: '看懂优化器在做什么' },
  tuning: { course_volume: 'standard', depth: 'intuition' },
  units: [
    {
      id: 'u1',
      title: '从一个比喻开始',
      objective: '建立"梯度指向上升最快方向"的直觉',
      lessons: [
        {
          id: 'c1',
          title: '优化问题：目标与方向',
          objective: '先说清楚我们在最小化什么',
          blueprint: { objective: 'o', prerequisites: ['导数'], sequence: ['s1'] },
          hasContent: true,
          progress: {
            state: 'finished',
            cursor: 12,
            steps: 12,
            updatedAt: '2026-09-26T09:00:00Z',
            practice: { answered: 3, total: 3 },
          },
        },
        {
          id: 'c2',
          title: '梯度的几何直觉',
          objective: '把"最陡方向"画出来',
          blueprint: null,
          hasContent: true,
          progress: {
            state: 'in_progress',
            cursor: 4,
            steps: 11,
            updatedAt: '2026-09-26T09:20:00Z',
            practice: { answered: 1, total: 2 },
          },
        },
        {
          id: 'c3',
          title: '学习率与发散',
          objective: null,
          blueprint: null,
          hasContent: true,
          progress: {
            state: 'not_started',
            cursor: 0,
            steps: 9,
            updatedAt: null,
            practice: { answered: 0, total: 2 },
          },
        },
      ],
    },
    {
      id: 'u2',
      title: '走到形式化',
      objective: '把直觉写成更新规则',
      lessons: [
        {
          id: 'c4',
          title: '更新规则：公式化的"下山"',
          objective: null,
          blueprint: null,
          hasContent: false,
          progress: {
            state: 'pending_content',
            cursor: 0,
            steps: 0,
            updatedAt: null,
            practice: { answered: 0, total: 0 },
          },
        },
      ],
    },
  ],
}

const STEPS: TeachingStep[] = [
  { id: 's1', title: '损失地形', narration: '第一句。第二句。', actions: [] },
  { id: 's2', title: '梯度指向哪', narration: '第一句。第二句。', actions: [] },
  { id: 's3', title: '为什么学习率会炸', narration: '第一句。', actions: [] },
  { id: 's4', title: '小结', narration: '第一句。', actions: [] },
]

function frame(title: string, node: React.ReactNode) {
  return (
    <section style={{ borderBottom: '1px solid #e4e4e7', padding: '12px 0' }}>
      <h2 style={{ fontSize: 13, color: '#71717a', margin: '0 0 8px' }}>{title}</h2>
      {node}
    </section>
  )
}

export function FreeCoursePageRenderHarness() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
    },
  })
  client.setQueryData(freeCourseDetailQueryKey(COURSE.id), COURSE)

  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/free-course/${COURSE.id}`]}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: 16, background: '#fff' }}>
          {frame(
            '课程页（/free-course/:id）',
            <Routes>
              <Route path="/free-course/:id" element={<FreeCourseDetailView />} />
            </Routes>
          )}
          {frame(
            '会话提纲 · 已讲到第 3 拍（无外部引用）',
            <div style={{ display: 'flex', gap: 12 }}>
              <SessionOutline
                title="优化问题：目标与方向"
                objective="先说清楚我们在最小化什么"
                steps={STEPS}
                playedStepIds={['s1', 's2', 's3']}
                activeStepId="s3"
                references={[]}
                open
                onToggle={() => undefined}
              />
            </div>
          )}
          {frame(
            '会话提纲 · 有前置（第 1 拍）',
            <div style={{ display: 'flex', gap: 12 }}>
              <SessionOutline
                title="优化问题：目标与方向"
                objective="先说清楚我们在最小化什么"
                steps={STEPS}
                playedStepIds={['s1']}
                activeStepId="s1"
                references={['导数与偏导数', '上一节：为什么需要优化']}
                open
                onToggle={() => undefined}
              />
            </div>
          )}
        </div>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
