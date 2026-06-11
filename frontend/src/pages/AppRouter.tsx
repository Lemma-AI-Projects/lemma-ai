import { type RouteObject, useRoutes } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { AppLayout } from '@/layouts/AppLayout'
import { ConversationPage } from '@/pages/ConversationPage'
import { CoursePage } from '@/pages/CoursePage'
import { HomePage } from '@/pages/HomePage'
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage'
import { LoginPage } from '@/pages/LoginPage'
import { PluginsPage } from '@/pages/PluginsPage'
import { ProjectPage } from '@/pages/ProjectPage'
import { SchedulePage } from '@/pages/SchedulePage'

const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <RequireAuth />,
    children: [
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
            // 可选 id：/chat 为新会话态，采纳预生成 id 后 replace 为
            // /chat/{id}，同一路由避免 remount 杀死进行中的流
            path: 'chat/:id?',
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
    ],
  },
]

export function AppRouter() {
  return useRoutes(routes)
}
