/**
 * Offscreen-render harness for the sidebar/app shell — NOT application code.
 *
 * It exists to check the *entry* half of the 个人资料 work: that the sidebar
 * header now carries the avatar menu (so the page is two clicks away from
 * anywhere, not only from /home), and that the sidebar entry is named 个人资料
 * instead of the old Home (which collided with the app home).
 *
 * Same provider rule as the other harnesses: QueryClientProvider / AuthProvider
 * must come from the project's own module graph, so this file lives inside it
 * and a `.mjs` script only loads it via `ssrLoadModule`. Not imported by the app
 * and not routed.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { AuthProvider } from '@/features/auth/AuthProvider'
import { currentUserQueryKey } from '@/features/auth/useCurrentUser'
import { conversationsQueryKey } from '@/features/conversation/conversationApi'
import { projectsQueryKey } from '@/features/project/projectApi'
import { AppLayout } from '@/layouts/AppLayout'

export function AppLayoutRenderHarness() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
    },
  })

  // Empty lists are the point: the sidebar's own items (the ones this check is
  // about) must render even when the space and chat lists are empty.
  client.setQueryData(projectsQueryKey, [])
  client.setQueryData(conversationsQueryKey, [])
  client.setQueryData([...currentUserQueryKey, undefined], {
    id: 'harness-user',
    email: 'ceaser@lemma.ai',
    nickname: 'Ceaser',
    subscriptionPlan: 'Pro',
    avatarColor: '#FF8F50',
    avatarLabel: 'C',
    createdAt: '2026-01-01T00:00:00.000Z',
  })

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/me']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/me" element={<div />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
