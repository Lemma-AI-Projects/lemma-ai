/**
 * Offscreen-render harness for 聚焦模式 —— NOT application code.
 *
 * It renders the **real** `FocusView` (the same component the route mounts) and the
 * real empty state, with the same fixture the `/preview/focus` page uses, so what
 * this asserts is what a reviewer sees in the browser.
 *
 * Provider rule (same as the other harnesses): QueryClientProvider / AuthProvider
 * must come from the project's own module graph, so this file lives inside it and
 * a `.mjs` script only loads it through `ssrLoadModule`. Not imported by the app.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { AuthProvider } from '@/features/auth/AuthProvider'
import { FocusEmptyState } from '@/features/learn-space/focus/FocusView'
import { FOCUS_PREVIEW } from '@/features/learn-space/focus/previewFixture'
import { FocusView } from '@/features/learn-space/focus/FocusView'

function Providers({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
    },
  })
  // 预览模式不连后端：这几个 query 都是 enabled=false，但 useQuery 仍然要一个
  // QueryClient 才不会抛 "No QueryClient set"。
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/preview/focus']}>{children}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export function FocusRenderHarness() {
  return (
    <Providers>
      <FocusView preview={FOCUS_PREVIEW} />
    </Providers>
  )
}

/** 空态（null stack）：聚焦默认不打开任何资料时的那一屏。 */
export function FocusEmptyRenderHarness() {
  return (
    <Providers>
      <Routes>
        <Route
          path="/preview/focus"
          element={
            <FocusEmptyState
              pages={FOCUS_PREVIEW.pages}
              isPagesLoading={false}
              spaceId="space-1"
              onOpenPage={() => undefined}
            />
          }
        />
      </Routes>
    </Providers>
  )
}
