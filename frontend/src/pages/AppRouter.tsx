import { type RouteObject, useRoutes } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { GoogleOAuthCallback } from '@/features/calendar/OAuthCallbackHandler'
import { AppLayout } from '@/layouts/AppLayout'
import { ConversationPage } from '@/pages/ConversationPage'
import { ConversationSandboxPage } from '@/pages/ConversationSandboxPage'
import { CourseCenterPage } from '@/pages/CourseCenterPage'
import { CoursePage } from '@/pages/CoursePage'
import { CourseCenterPreviewPage } from '@/pages/CourseCenterPreviewPage'
import { CreditsPage } from '@/pages/CreditsPage'
import { CreditsPreviewPage } from '@/pages/CreditsPreviewPage'
import { FreeCourseBlueprintPreviewPage } from '@/pages/FreeCourseBlueprintPreviewPage'
import { FreeCourseTuningPreviewPage } from '@/pages/FreeCourseTuningPreviewPage'
import { DocEditorView } from '@/features/docs/DocEditorView'
import { FreeCourseBlueprintView } from '@/features/free-course/FreeCourseBlueprintView'
import { FreeCourseDetailView } from '@/features/free-course/FreeCourseDetailView'
import { FreeCourseLessonView } from '@/features/free-course/FreeCourseLessonView'
import { HomePage } from '@/pages/HomePage'
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage'
import { LandingPage } from '@/pages/LandingPage'
import { LearnSpacesPage } from '@/pages/LearnSpacesPage'
import { LearnSpacesPreviewPage } from '@/pages/LearnSpacesPreviewPage'
import { VoicePage } from '@/pages/VoicePage'
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
    // 布局评审入口：公开、免登录，只渲染 mock 数据，用于对齐视觉稿。
    path: '/preview/courses',
    element: <CourseCenterPreviewPage />,
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
    // 布局评审入口：公开、免登录，只渲染 mock 数据。
    path: '/preview/credits',
    element: <CreditsPreviewPage />,
  },
  {
    // 布局评审入口：暂停点卡片（蓝图 + 调参问卷），mock 数据。
    path: '/preview/free-course-tuning',
    element: <FreeCourseTuningPreviewPage />,
  },
  {
    // 布局评审入口：生成后的蓝图页（规模徽章 + 受众 + 设置芯片），mock 数据。
    // 路径里的 :id 要在 URL 上写 preview，预览页就是按这个 key 灌的 mock。
    path: '/preview/free-course-blueprint/:id',
    element: <FreeCourseBlueprintPreviewPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: 'auth/google/callback',
        element: <GoogleOAuthCallback />,
      },
      {
        // 学习空间工作台：全屏白色画布 + 自带顶栏，参考稿里没有侧栏，
        // 所以这条路由不套 AppLayout。
        path: 'learn-spaces/:id',
        element: <LearnSpaceWorkspacePage />,
      },
      {
        // 文档编辑器：同样全屏沉浸布局（P0.3 为骨架，P0.4 实装块编辑）。
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
            path: 'courses',
            element: <CourseCenterPage />,
          },
          {
            path: 'knowledge',
            element: <KnowledgeBasePage />,
          },
          {
            path: 'voice',
            element: <VoicePage />,
          },
          {
            // 学习空间总览（UI 改名层：数据层仍为 projects）。
            path: 'learn-spaces',
            element: <LearnSpacesPage />,
          },
          {
            // Credits 充值：入口在头像菜单，侧栏不出现。
            path: 'credits',
            element: <CreditsPage />,
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
            path: 'course/:id',
            element: <CoursePage />,
          },
          {
            path: 'free-course/:id',
            element: <FreeCourseDetailView />,
          },
          {
            path: 'free-course/:id/blueprint',
            element: <FreeCourseBlueprintView />,
          },
          {
            path: 'free-course/:id/lesson/:chapterId',
            element: <FreeCourseLessonView />,
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
