import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import type { LearningBrief } from './types'

/**
 * Learning Brief 的数据源。`GET /api/v1/knowledge/brief?projectId=`
 *
 * 后端是**纯派生**的：简报的每一段都是知识结构的可计算量（状态 / 内边缘 /
 * 外边缘），没有模型调用、没有缓存快照。所以这里有两条与前端的约定：
 *
 * 1. **刷新 = 重新算，不是重新生成。** `staleTime` 只挡住无意义的重复请求；
 *    任何一次失效都会真的重算一遍（毫秒级）。
 * 2. **失败必须退回 `undefined`，不能停在 `null`。** 三态里 `null` 是「读取中」，
 *    停在 `null` 面板会永远转圈；退回 `undefined` 板块直接消失 —— 与「功能没上线」
 *    长得一样，但那是诚实的（`planning/PENDING.md` F6）。
 */

export const learningBriefQueryKey = (projectId: string) =>
  ['knowledge', 'brief', projectId] as const

async function fetchLearningBrief(projectId: string): Promise<LearningBrief> {
  const { data } = await signOutOn401(
    apiClient.get<LearningBrief>('/api/v1/knowledge/brief', {
      params: { projectId },
    })
  )
  return data
}

/**
 * 一个空间的学习简报。
 *
 * 返回 `brief` 而不是裸 query —— 三态（未启用 / 读取中 / 有数据）是面板的
 * 契约，由这里统一翻译，页面不再自己判断。
 */
export function useLearningBriefQuery(projectId: string | undefined) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: learningBriefQueryKey(projectId ?? 'none'),
    queryFn: () => fetchLearningBrief(projectId as string),
    enabled: Boolean(projectId),
    retry: retryUnlessClientError,
    // The backend recomputes on every read and it is cheap; this only stops a
    // remount from firing another request.
    staleTime: 30_000,
    // Errors are surfaced through `isError`, never thrown: React Query's
    // default would bubble them into the route error boundary and kill the
    // whole workspace for a missing brief.
    throwOnError: false,
  })

  const refresh = useCallback(() => {
    if (!projectId) return
    void queryClient.invalidateQueries({
      queryKey: learningBriefQueryKey(projectId),
    })
  }, [projectId, queryClient])

  // undefined = 板块未启用（没有空间 / 后端不可用）
  // null      = 读取中（面板先出骨架）
  // 对象      = 有数据
  // `!projectId` 也算「未启用」：否则 query 被 disabled 会一直停在 pending，
  // 面板会永远转圈。
  const brief: LearningBrief | null | undefined =
    !projectId || query.isError
      ? undefined
      : query.isPending
        ? null
        : query.data

  return { brief, refresh, isRefreshing: query.isFetching }
}
