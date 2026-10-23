import { type RouteObject, useRoutes } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { FocusView } from '@/features/learn-space/focus/FocusView'
import { AppLayout } from '@/layouts/AppLayout'
import { PREVIEW_ROUTES } from './previewRegistry'
import { PreviewIndexPage } from './PreviewIndexPage'
import { BoardSandboxPage } from '@/pages/BoardSandboxPage'
import { ConversationPage } from '@/pages/ConversationPage'
import { ConversationSandboxPage } from '@/pages/ConversationSandboxPage'
import { CourseCenterPage } from '@/pages/CourseCenterPage'
import { CourseDashboardPage } from '@/pages/CourseDashboardPage'
import { CoursePointPage } from '@/pages/CoursePointPage'
import { CourseQuizSandboxPage } from '@/pages/CourseQuizSandboxPage'
import { FreeCourseBlueprintView } from '@/features/free-course/FreeCourseBlueprintView'
import { FreeCourseDetailView } from '@/features/free-course/FreeCourseDetailView'
import { FreeCourseLessonView } from '@/features/free-course/FreeCourseLessonView'
import { TeachingSessionView } from '@/features/free-course/session/TeachingSessionView'
import { UserHomePage } from '@/features/user-home/UserHomePage'
import { CreditsPage } from '@/pages/CreditsPage'
import { HomePage } from '@/pages/HomePage'
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage'
import { LandingPage } from '@/pages/LandingPage'
import { LearnSpacesPage } from '@/pages/LearnSpacesPage'
import { LearnSpaceWorkspacePage } from '@/pages/LearnSpaceWorkspacePage'
import { LoginPage } from '@/pages/LoginPage'
import { PluginsPage } from '@/pages/PluginsPage'
import { ProjectPage } from '@/pages/ProjectPage'
import { SchedulePage } from '@/pages/SchedulePage'
import { TrajectorySpacePage } from '@/pages/TrajectorySpacePage'

const routes: RouteObject[] = [
  {
    // 公开落地页：独立于登录鉴权和产品 AppLayout。
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // /preview 索引：全部评审入口的目录。**清单是唯一来源**（./previewRegistry.tsx），
    // 路由从这里 map 出来 —— 新增 preview 只改清单，路由和索引自动同步。
    path: '/preview',
    element: <PreviewIndexPage />,
  },
  ...PREVIEW_ROUTES.map((route) => ({
    path: route.path,
    element: route.element,
  })),
  {
    element: <RequireAuth />,
    children: [
      {
        path: 'sandbox/board',
        element: <BoardSandboxPage />,
      },
      {
        // 学习空间工作台：全屏白色画布 + 自带顶栏，参考稿里没有侧栏，
        // 所以这条路由不套 AppLayout。
        path: 'learn-spaces/:id',
        element: <LearnSpaceWorkspacePage />,
      },
      {
        // 聚焦模式（单份资料）：全屏、不套 AppLayout。它就是原来那条"只读预览"
        // 升级来的 —— 现在能写、有大纲、能在资料之间一直往前走。
        // 设计见 .workbuddy/research/focus-mode-design.md。
        path: 'learn-spaces/:id/docs/:pageId',
        element: <FocusView />,
      },
      {
        // 聚焦模式没有选中资料时（null stack）：空态是它的一等状态，
        // 不是"没加载完"。dimension 下拉里的「聚焦」落到这里。
        path: 'learn-spaces/:id/focus',
        element: <FocusView />,
      },
      {
        // 轨迹（Trajectory）：这个空间**真实发生过什么**。
        // 只读、不套 AppLayout（和上面两条一样是"一屏到底"的页）。
        // ⚠️ 这一版只画事实、不写判断 —— 见 pages/TrajectorySpacePage.tsx 顶部。
        path: 'learn-spaces/:id/trajectory',
        element: <TrajectorySpacePage />,
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
            // 自由课程（Free Course）：与视频课并行的另一条课程管线。它不走
            // 仪表盘/学习点，而是「课程 -> 课节 -> 教学会话」。courses.mode
            // 决定课程中心的卡片往哪边跳。
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
            // 教学会话（Hyperknow 式：语音 + 白板 + 提问）。与课节页同一份
            // 内容的另一种形态：那一页是「读它」，这一页是「被讲它」。
            path: 'free-course/:id/lesson/:chapterId/session',
            element: <TeachingSessionView />,
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
            // Home（Global User Layer V0）：跨学习空间跟着用户走的那一页。
            // 注意路由不叫 /home —— 那是 app 首页（New chat）。
            path: 'me',
            element: <UserHomePage />,
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
