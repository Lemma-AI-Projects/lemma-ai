import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { currentUserQueryKey } from '@/features/auth/useCurrentUser'
import { UserHomePage } from '@/features/user-home/UserHomePage'
import { userHomeQueryKey } from '@/features/user-home/userHomeApi'
import type { UserHome, UserHomeItem } from '@/features/user-home/types'

// 布局评审专用：不套 RequireAuth / AppLayout，直接喂 mock 数据，不起后端、不登录
// 即可查看「个人资料」页的六段结构与两种列表形态（标签 / 句子），以及提议长在
// 它将要落进的区块里的样子。与 /preview/schedule、/preview/credits 同一套做法：
// 预置 query 缓存 + staleTime: Infinity，所以它不会去请求真接口。
//
// 评审的是「这一页长什么样」，不是读写链路 —— 读写由
// tests/api/test_user_home_api.py 负责。
const previewQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
  },
})

function item(
  id: string,
  kind: 'interest' | 'preference',
  text: string,
  status: 'candidate' | 'confirmed' = 'confirmed',
  origin: 'user' | 'agent' = 'user'
): UserHomeItem {
  return {
    id,
    kind,
    text,
    status,
    origin,
    sourceSpaceId: null,
    createdAt: '2026-09-26T04:00:00.000Z',
    confirmedAt: status === 'confirmed' ? '2026-09-26T04:00:00.000Z' : null,
  }
}

const previewHome: UserHome = {
  nickname: 'Ceaser',
  language: 'zh',
  background: '本科·计算机，转行做前端',
  interests: [
    item('preview-i1', 'interest', 'AI'),
    item('preview-i2', 'interest', '认知科学'),
    item('preview-i3', 'interest', '哲学'),
  ],
  preferences: [
    item('preview-p1', 'preference', '回答尽量简洁'),
    item('preview-p2', 'preference', '先给例子，再讲抽象'),
    item('preview-p3', 'preference', '回答尽量简洁一点', 'confirmed', 'agent'),
  ],
  // One proposal per block: an interest one (renders as a dashed tag) and a
  // preference one (renders as a dashed sentence row), so both dotted titles and
  // both proposal shapes are visible without scrolling through a long list.
  candidates: [
    item('preview-c1', 'interest', '线性代数', 'candidate', 'agent'),
    item('preview-c2', 'preference', '以后都尽量简洁一点', 'candidate', 'agent'),
  ],
}

previewQueryClient.setQueryData(userHomeQueryKey, previewHome)

// The identity band reads `useCurrentUser()`, whose key carries the session's
// user id — with no session that segment is `undefined`. Seeding that exact key
// is what lets the band render avatar / email / plan without a token.
previewQueryClient.setQueryData([...currentUserQueryKey, undefined], {
  id: 'preview-user',
  email: 'ceaser@lemma.ai',
  nickname: 'Ceaser',
  subscriptionPlan: 'Pro',
  avatarColor: '#FF8F50',
  avatarLabel: 'C',
  createdAt: '2026-01-01T00:00:00.000Z',
})

export function UserProfilePreviewPage() {
  return (
    <QueryClientProvider client={previewQueryClient}>
      <div className="h-screen bg-zinc-100 p-2">
        <UserHomePage />
      </div>
    </QueryClientProvider>
  )
}
