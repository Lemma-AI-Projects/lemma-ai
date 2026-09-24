import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { subDays, subHours } from 'date-fns'

import { notificationsQueryKey } from '@/features/notifications/notificationApi'
import type { Notification } from '@/features/notifications/types'
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

const previewNotifications: Notification[] = [
  {
    // 今天：两条路都会出现 —— Today 栏的卡片 + 今天格子里的 chip。
    id: 'preview-reminder',
    title: 'Review reminder',
    body: 'You studied Eigenvectors three days ago — worth re-checking the proof.',
    type: 'reminder',
    timestamp: subHours(new Date(), 1).toISOString(),
    metadata: { source: 'preview' },
  },
  {
    // 两天前：只留在日历那一格里。
    id: 'preview-lesson-done',
    title: 'Lesson 12 marked complete',
    body: 'Linear Algebra Lecture 12 is finished. Next up: diagonalization.',
    type: 'notification',
    timestamp: subDays(new Date(), 2).toISOString(),
    metadata: { source: 'preview' },
  },
  {
    id: 'preview-system',
    title: 'Weekly plan updated',
    body: 'Your learn space gained two new knowledge items this week.',
    type: 'system',
    timestamp: subDays(new Date(), 6).toISOString(),
    metadata: { source: 'preview' },
  },
]

previewQueryClient.setQueryData(notificationsQueryKey, previewNotifications)

export function SchedulePreviewPage() {
  return (
    <QueryClientProvider client={previewQueryClient}>
      <div className="h-screen bg-zinc-100 p-2">
        <SchedulePage />
      </div>
    </QueryClientProvider>
  )
}
