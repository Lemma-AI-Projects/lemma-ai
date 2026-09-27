/**
 * Offscreen-render harness for the Home page — NOT application code.
 *
 * It exists because a provider and the page's `useQuery` must come from the SAME
 * module instance, and only a file inside the project's own module graph
 * guarantees that: loading react-query by bare specifier from a `.mjs` script
 * gives a second instance and the page throws "No QueryClient set".
 *
 * Not imported by the app and not routed; the only consumer is
 * `.workbuddy/localdb/render_user_home.mjs`. It sits outside `src/` on purpose.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

import { currentUserQueryKey } from '@/features/auth/useCurrentUser'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { UserHomePage } from '@/features/user-home/UserHomePage'
import { userHomeQueryKey } from '@/features/user-home/userHomeApi'
import type { UserHome, UserHomeItem } from '@/features/user-home/types'

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

const home: UserHome = {
  nickname: 'Ceaser',
  language: 'zh',
  background: '本科·计算机，转行做前端',
  interests: [
    item('i1', 'interest', 'AI'),
    item('i2', 'interest', '认知科学'),
    item('i3', 'interest', '哲学'),
  ],
  preferences: [
    item('p1', 'preference', '回答尽量简洁'),
    item('p2', 'preference', '先给例子，再讲抽象'),
    item('p3', 'preference', '回答尽量简洁一点', 'confirmed', 'agent'),
  ],
  candidates: [
    item('c1', 'interest', '线性代数', 'candidate', 'agent'),
    item('c2', 'preference', '以后都尽量简洁一点', 'candidate', 'agent'),
  ],
}

/**
 * The identity band reads `useCurrentUser()`, whose key carries the session's
 * user id — `undefined` when nobody is signed in, which is exactly the case in
 * this harness. Seeding that key is what makes the band renderable offscreen.
 */
const currentUser = {
  id: 'harness-user',
  email: 'ceaser@lemma.ai',
  nickname: 'Ceaser',
  subscriptionPlan: 'Pro',
  avatarColor: '#FF8F50',
  avatarLabel: 'C',
  createdAt: '2026-01-01T00:00:00.000Z',
}

export function UserHomeRenderHarness() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
    },
  })
  client.setQueryData(userHomeQueryKey, home)
  client.setQueryData([...currentUserQueryKey, undefined], currentUser)

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter>
          <UserHomePage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
