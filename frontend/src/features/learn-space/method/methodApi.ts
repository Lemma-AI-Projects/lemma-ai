import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'

/**
 * Focus 顶部那颗 method 状态栏要说的东西。
 *
 * **这里没有 method 的名字**（后端刻意不给）：界面上只出现动词，不出现术语 ——
 * 一个名字会邀请用户去评价这种教法，一个动词只会邀请他去做。所以这个类型里也
 * 没有"名字"这个字段可以渲染，少一个字段就少一种做错的方式。
 *
 * 四格里没有进度、没有分数：`completion` 是**判据**（什么算过），不是完成度。
 */
export interface MethodStatus {
  /** ① 我们现在在做什么。 */
  systemMove: string
  /** ② 要你做什么。 */
  learnerMove: string
  /** ③ 什么算完成。 */
  completion: string
  /** 这件事和你的目标什么关系。空间没有目标时是 `null` —— 那就不说。 */
  goalRelation: string | null
}

const methodStatusQueryKey = (projectId: string, conversationId?: string) =>
  ['method', 'status', projectId, conversationId ?? 'none'] as const

export function useMethodStatusQuery(
  projectId: string | undefined,
  conversationId?: string | null
) {
  const query = useQuery({
    queryKey: methodStatusQueryKey(projectId ?? 'none', conversationId ?? undefined),
    queryFn: async () => {
      const { data } = await signOutOn401(
        apiClient.get<MethodStatus>('/api/v1/methods/status', {
          params: {
            projectId,
            ...(conversationId ? { conversationId } : {}),
          },
        })
      )
      return data
    },
    enabled: Boolean(projectId),
    retry: retryUnlessClientError,
    staleTime: 60_000,
    throwOnError: false,
  })

  // 三态：`undefined` = 还没有（读中 / 没启用），`null` = 读不到，对象 = 有。
  // 读不到**不许**显示成"没有状态" —— 那会让顶栏看起来一切正常而其实它不知道。
  const status: MethodStatus | null | undefined = !projectId || query.isPending
    ? undefined
    : query.isError
      ? null
      : query.data

  return { status }
}
