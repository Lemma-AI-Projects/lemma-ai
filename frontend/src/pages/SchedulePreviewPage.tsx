import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { format, setHours, setMinutes, subDays, subHours } from 'date-fns'

import { notificationsQueryKey } from '@/features/notifications/notificationApi'
import type { Notification } from '@/features/notifications/types'
import { scheduledTasksQueryKey } from '@/features/scheduler/schedulerApi'
import type { ScheduledTask } from '@/features/scheduler/types'
import { SchedulePage } from '@/pages/SchedulePage'

// 布局评审专用：不套 RequireAuth / AppLayout，直接喂 mock 数据，不起后端、不登录
// 即可查看通知在 Feed 里的两种形态（Today 栏的卡片 + 月历格子里的 chip）。
// 与 /preview/credits 同一套做法：预置 query 缓存，staleTime 设为 Infinity，
// 所以它不会去请求真接口，页面渲染的就是 fixtures。
//
// 评审的是「通知在 Feed 中长什么样」，不是发送链路 —— 发送链路由
// tests/api/test_notifications_api.py 和日程页上的开发按钮负责。
const previewQueryClient = new QueryClient({
  defaultOptions: {
    // staleTime: Infinity + no refetch on focus: the fixture is the data, and
    // nothing here may reach for the real API (a 401 would blank the page).
    queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
  },
})

/**
 * Mock notifications, dated relative to today so the review surface never goes
 * stale: one for now (it shows in both places — the Today column AND today's
 * cell), then three spread back over the past two weeks so the chips can be seen
 * landing on different days of the month.
 *
 * The dates are mock dates and they are visible as such: each card prints its
 * own `Sep 24, 10:20` stamp, and the reminder's body quotes the study date a
 * future Scheduler would have known.
 */
const now = new Date()
const previewNotifications: Notification[] = [
  {
    id: 'preview-reminder',
    title: 'Review reminder',
    body: `You studied Eigenvectors on ${format(subDays(now, 3), 'MMM d')} — worth re-checking the proof.`,
    type: 'reminder',
    timestamp: subHours(now, 1).toISOString(),
    metadata: { source: 'preview' },
  },
  {
    id: 'preview-lesson-done',
    title: 'Lesson 12 marked complete',
    body: 'Linear Algebra Lecture 12 is finished. Next up: diagonalization.',
    type: 'notification',
    timestamp: subDays(now, 2).toISOString(),
    metadata: { source: 'preview' },
  },
  {
    id: 'preview-system',
    title: 'Weekly plan updated',
    body: 'Your learn space gained two new knowledge items this week.',
    type: 'system',
    timestamp: subDays(now, 6).toISOString(),
    metadata: { source: 'preview' },
  },
  {
    id: 'preview-quiz',
    title: 'Quiz results are in',
    body: 'Eigenvalues: 4 of 5 correct. The missed item was added back to your review queue.',
    type: 'notification',
    timestamp: subDays(now, 11).toISOString(),
    metadata: { source: 'preview' },
  },
]

previewQueryClient.setQueryData(notificationsQueryKey, previewNotifications)

/**
 * Mock scheduled tasks — the Scheduler's half of the Feed.
 *
 * Two pending (one later today, one tomorrow 19:00 — the shape the dev button
 * creates) and one executed, which must NOT render: a promise that has already
 * been kept is history, and its outcome is the notification it produced.
 */
function at(hour: number, minute: number, dayOffset = 0): string {
  const day = subDays(new Date(), -dayOffset)
  return setMinutes(setHours(day, hour), minute).toISOString()
}

const previewTasks: ScheduledTask[] = [
  {
    id: 'preview-task-today',
    runAt: at(19, 0),
    type: 'notification',
    payload: { title: 'Review reminder', body: 'Time to review the Eigenvector proof.' },
    status: 'pending',
    createdAt: subHours(now, 2).toISOString(),
    executedAt: null,
    error: null,
  },
  {
    id: 'preview-task-tomorrow',
    runAt: at(19, 0, 1),
    type: 'notification',
    payload: { title: 'Review eigenvalues', body: 'A second pass at the worked examples.' },
    status: 'pending',
    createdAt: subHours(now, 2).toISOString(),
    executedAt: null,
    error: null,
  },
  {
    id: 'preview-task-done',
    runAt: subDays(now, 1).toISOString(),
    type: 'notification',
    payload: { title: 'Already fired', body: 'Kept promises are history, not plan.' },
    status: 'executed',
    createdAt: subDays(now, 1).toISOString(),
    executedAt: subDays(now, 1).toISOString(),
    error: null,
  },
]

previewQueryClient.setQueryData(scheduledTasksQueryKey, previewTasks)

export function SchedulePreviewPage() {
  return (
    <QueryClientProvider client={previewQueryClient}>
      <div className="h-screen bg-zinc-100 p-2">
        <SchedulePage />
      </div>
    </QueryClientProvider>
  )
}
