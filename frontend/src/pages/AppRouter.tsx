import { type RouteObject, useRoutes } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { BoardDemoPage } from '@/features/board/BoardDemoPage'
import { AppLayout } from '@/layouts/AppLayout'
import { ConversationPage } from '@/pages/ConversationPage'
import { ConversationSandboxPage } from '@/pages/ConversationSandboxPage'
import { CoursePage } from '@/pages/CoursePage'
import { DevDashboardPage } from '@/pages/admindev/DevDashboardPage'
import { HomePage } from '@/pages/HomePage'
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { PluginsPage } from '@/pages/PluginsPage'
import { ProjectPage } from '@/pages/ProjectPage'
import { PayPage } from '@/features/payments/PayPage'
import { SchedulePage } from '@/pages/SchedulePage'

const routes: RouteObject[] = [
  {
    // Board 底座验证（E0.1）：tldraw 最小画布 demo，临时调试入口。
    path: 'board-demo',
    element: <BoardDemoPage />,
  },
  {
    // Dev dashboard: own auth (ceaser/syk), outside the business RequireAuth.
    path: 'admindev',
    element: <DevDashboardPage />,
  },
  {
    // 公开落地页：未登录默认停留；已登录在页面内重定向到 /home。
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: 'home',
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
            path: 'gotopay',
            element: <PayPage />,
          },
          {
            // 可选 id：/chat 为新会话态，采纳预生成 id 后 replace 为
            // /chat/{id}，同一路由避免 remount 杀死进行中的流
            path: 'chat/:id?',
            element: <ConversationPage />,
          },
          {
            // [sandbox] 临时调试路由，开发完成后可连同沙盒页面整体移除。
            path: 'sandbox',
            element: <ConversationSandboxPage />,
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
