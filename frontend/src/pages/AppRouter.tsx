import { type RouteObject, useRoutes } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { DocEditorView } from '@/features/docs/DocEditorView'
import { AppLayout } from '@/layouts/AppLayout'
import { ConversationPage } from '@/pages/ConversationPage'
import { ConversationSandboxPage } from '@/pages/ConversationSandboxPage'
import { CourseCenterPage } from '@/pages/CourseCenterPage'
import { CourseDashboardPage } from '@/pages/CourseDashboardPage'
import { CoursePointPage } from '@/pages/CoursePointPage'
import { CourseQuizSandboxPage } from '@/pages/CourseQuizSandboxPage'
import { CreditsPage } from '@/pages/CreditsPage'
import { CreditsPreviewPage } from '@/pages/CreditsPreviewPage'
import { HomePage } from '@/pages/HomePage'
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage'
import { LandingPage } from '@/pages/LandingPage'
import { LearnSpacesPage } from '@/pages/LearnSpacesPage'
import { LearnSpacesPreviewPage } from '@/pages/LearnSpacesPreviewPage'
import { LearnSpaceWorkspacePage } from '@/pages/LearnSpaceWorkspacePage'
import { LearnSpaceWorkspacePreviewPage } from '@/pages/LearnSpaceWorkspacePreviewPage'
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
    // 布局评审入口：公开、免登录，只渲染 mock 数据。
    path: '/preview/learn-spaces',
    element: <LearnSpacesPreviewPage />,
  },
  {
    // 布局评审入口：学习空间工作台（全屏画布），mock 数据。
    path: '/preview/learn-space',
    element: <LearnSpaceWorkspacePreviewPage />,
  },
  {
    // 布局评审入口：Credits 充值页，mock 数据、不登录即可查看。
    path: '/preview/credits',
    element: <CreditsPreviewPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        // 学习空间工作台：全屏白色画布 + 自带顶栏，参考稿里没有侧栏，
        // 所以这条路由不套 AppLayout。
        path: 'learn-spaces/:id',
        element: <LearnSpaceWorkspacePage />,
      },
      {
        // 一块板（资料层）的查看页：全屏布局。块编辑器是下一步，
        // 这里先给抽屉一个真落点，避免「能点却 404」。
        path: 'learn-spaces/:id/docs/:pageId',
        element: <DocEditorView />,
      },
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
            // 学习空间总览（UI 改名层：数据层仍为 projects）。
            path: 'learn-spaces',
            element: <LearnSpacesPage />,
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
          {
            // Credits 充值：入口在头像菜单，侧栏不出现。
            path: 'credits',
            element: <CreditsPage />,
          },
        ],
      },
    ],
  },
]

export function AppRouter() {
  return useRoutes(routes)
}
