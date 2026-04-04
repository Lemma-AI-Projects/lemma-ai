import { type RouteObject, useRoutes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { ConversationPage } from '@/pages/ConversationPage'
import { HomePage } from '@/pages/HomePage'
import { ProjectPage } from '@/pages/ProjectPage'
import { SchedulePage } from '@/pages/SchedulePage'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'schedule',
        element: <SchedulePage />,
      },
      {
        path: 'chat/:id',
        element: <ConversationPage />,
      },
      {
        path: 'project/:id',
        element: <ProjectPage />,
      },
    ],
  },
]

export function AppRouter() {
  return useRoutes(routes)
}
