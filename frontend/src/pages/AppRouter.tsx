import { type RouteObject, useRoutes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { ConversationPage } from '@/pages/ConversationPage'
import { CoursePage } from '@/pages/CoursePage'
import { HomePage } from '@/pages/HomePage'
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage'
import { PluginsPage } from '@/pages/PluginsPage'
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
        path: 'knowledge',
        element: <KnowledgeBasePage />,
      },
      {
        path: 'plugins',
        element: <PluginsPage />,
      },
      {
        path: 'chat/:id',
        element: <ConversationPage />,
      },
      {
        path: 'course/:id',
        element: <CoursePage />,
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
