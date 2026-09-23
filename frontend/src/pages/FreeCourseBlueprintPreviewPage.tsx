import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { FreeCourseBlueprintView } from '@/features/free-course/FreeCourseBlueprintView'
import { freeCourseDetailQueryKey } from '@/features/free-course/freeCourseApi'
import { tuningCourseMock } from '@/mock/freeCourseTuning'

/**
 * 布局评审入口：**生成之后的蓝图页**（`/free-course/:id/blueprint`）。
 *
 * 公开、免登录、纯 mock —— 这个页面本来在 RequireAuth 后面、还要有真课程才看得到，
 * 没有预览入口就没法对照参考稿评审。
 *
 * 参数（走路由的 `:id`，所以路径是 `/preview/free-course-blueprint/preview`）：
 *   默认         已答过问卷（顶部有规模徽章 + 受众 + 四枚设置芯片）
 *   ?fresh=1     没答过问卷（`tuning: null` → 芯片整排不渲染）
 */
function buildQueryClient(withoutTuning: boolean) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // 关键：`staleTime: Infinity` 让灌进去的 mock 被当作**新鲜数据**，
        // 于是挂载时不会触发 refetch。否则会真去打
        // `GET /free-courses/preview` → 401/404 → isError 变 true →
        // 组件直接渲染「加载课程失败」，mock 白灌。
        staleTime: Infinity,
      },
    },
  })
  client.setQueryData(freeCourseDetailQueryKey('preview'), {
    ...tuningCourseMock,
    // 生成完之后是 ready，不再是 building
    status: 'ready',
    tuning: withoutTuning ? null : tuningCourseMock.tuning,
  })
  return client
}

export function FreeCourseBlueprintPreviewPage() {
  const withoutTuning =
    new URLSearchParams(window.location.search).get('fresh') === '1'

  return (
    <QueryClientProvider client={buildQueryClient(withoutTuning)}>
      <div className="h-screen bg-white dark:bg-zinc-950">
        <FreeCourseBlueprintView />
      </div>
    </QueryClientProvider>
  )
}
