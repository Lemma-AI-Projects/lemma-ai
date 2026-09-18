import { type RouteObject, useRoutes } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { AppLayout } from '@/layouts/AppLayout'
import { ConversationPage } from '@/pages/ConversationPage'
import { ConversationSandboxPage } from '@/pages/ConversationSandboxPage'
import { CourseCenterPage } from '@/pages/CourseCenterPage'
import { CourseDashboardPage } from '@/pages/CourseDashboardPage'
import { CoursePointPage } from '@/pages/CoursePointPage'
import { CourseQuizSandboxPage } from '@/pages/CourseQuizSandboxPage'
import { HomePage } from '@/pages/HomePage'
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { PluginsPage } from '@/pages/PluginsPage'
import { ProjectPage } from '@/pages/ProjectPage'
import { SchedulePage } from '@/pages/SchedulePage'

const routes: RouteObject[] = [
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
            // 课程中心 -> 课程仪表盘 -> 学习点，与后端
            // /api/v1/courses/{id}/points/{pointId} 同构。
            path: 'courses',
            element: <CourseCenterPage />,
          },
          {
            path: 'courses/:courseId',
            element: <CourseDashboardPage />,
          },
          {
            path: 'courses/:courseId/points/:pointId',
            element: <CoursePointPage />,
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
            // [sandbox] 临时调试路由，开发完成后可连同沙盒页面整体移除。
            path: 'sandbox',
            element: <ConversationSandboxPage />,
          },
          {
            path: 'sandbox/quiz',
            element: <CourseQuizSandboxPage />,
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
