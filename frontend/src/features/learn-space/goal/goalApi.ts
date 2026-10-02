import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import type {
  GoalCloseReason,
  GoalPurpose,
  GoalSuggestion,
  SpaceGoal,
} from './types'

/**
 * 目标的数据源：`/api/v1/projects/{id}/goals*`。
 *
 * 三条与页面约定好的事：
 *
 * 1. **`active` 的 `null` 是正常状态，不是错误。** 空间还没有目标、或者目标被暂停，
 *    都会读到 `null`。页面必须把它渲染成"还没有目标"，不能弹错误。
 * 2. **一次点击 = create + confirm。** 后端刻意把它拆成两个动作（建立永远产出 `draft`），
 *    这里把它们合在一次交互里 —— 因为学习者那一次点击**就是**确认本身。拆成两步点击
 *    是让用户给系统点两次头，不是严谨。
 * 3. **抽取不写库。** `suggestGoal` 只是"读一遍"，拿到的东西还是建议；写不写由上面
 *    那次确认决定。
 */

export const activeGoalQueryKey = (projectId: string) =>
  ['goals', 'active', projectId] as const

async function fetchActiveGoal(projectId: string): Promise<SpaceGoal | null> {
  const { data } = await signOutOn401(
    apiClient.get<SpaceGoal | null>(`/api/v1/projects/${projectId}/goals/active`)
  )
  return data ?? null
}

/**
 * 这个空间正在推进的方向。`null` = 没有（或已暂停）—— 一个正常状态。
 *
 * `goal` 三态与简报同一个约定：`undefined` = 读不到 / 没启用，`null` = 确实没有。
 * 两者必须分得开 —— "读不到"要说"读不到"，不能顺势说成"你还没设目标"。
 */
export function useActiveGoalQuery(projectId: string | undefined) {
  const query = useQuery({
    queryKey: activeGoalQueryKey(projectId ?? 'none'),
    queryFn: () => fetchActiveGoal(projectId as string),
    enabled: Boolean(projectId),
    retry: retryUnlessClientError,
    staleTime: 30_000,
    throwOnError: false,
  })

  const enabled = Boolean(projectId)
  const goal: SpaceGoal | null | undefined =
    !enabled || query.isError || query.isPending ? undefined : query.data

  return {
    goal,
    isPending: enabled && query.isPending,
    isError: enabled && query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}

function useInvalidateGoal(projectId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: activeGoalQueryKey(projectId) })
    // 简报里那一格也是同一个事实（`goal` / `isGoalInferred`），一起失效，
    // 否则两处会有一段时间说不一样的话。
    void queryClient.invalidateQueries({ queryKey: ['knowledge', 'brief', projectId] })
  }
}

export interface GoalDraftInput {
  targetText: string
  purpose: GoalPurpose
  deadlineAt?: string | null
  context?: string | null
  origin?: 'user_stated' | 'user_entered' | 'agent_proposed'
}

/**
 * 学习者点了头：建立 + 确认。
 *
 * 后端仍然是两步（建立永远产出 `draft`），这里串起来是因为**这一次点击就是确认**：
 * 让用户先建一个草稿再点一次"我确认"，是给系统点两次头，不是严谨。
 * 中间那一步失败时留下一条 `draft` 行 —— 无害（它不驱动任何东西），页面会把它当作
 * "还没确认的目标"显示出来。
 */
export function useConfirmNewGoalMutation(projectId: string) {
  const invalidate = useInvalidateGoal(projectId)

  return useMutation({
    mutationFn: async (input: GoalDraftInput) => {
      const created = await signOutOn401(
        apiClient.post<SpaceGoal>(`/api/v1/projects/${projectId}/goals`, {
          targetText: input.targetText,
          purpose: input.purpose,
          deadlineAt: input.deadlineAt ?? null,
          context: input.context ?? null,
          origin: input.origin ?? 'user_entered',
        })
      )
      const confirmed = await signOutOn401(
        apiClient.post<SpaceGoal>(
          `/api/v1/projects/${projectId}/goals/${created.data.id}/confirm`
        )
      )
      return confirmed.data
    },
    onSuccess: invalidate,
  })
}

export function useUpdateGoalMutation(projectId: string) {
  const invalidate = useInvalidateGoal(projectId)

  return useMutation({
    mutationFn: async (input: {
      goalId: string
      targetText?: string
      deadlineAt?: string | null
      context?: string | null
      purpose?: GoalPurpose
    }) => {
      const { goalId, ...body } = input
      const { data } = await signOutOn401(
        apiClient.patch<SpaceGoal>(
          `/api/v1/projects/${projectId}/goals/${goalId}`,
          body
        )
      )
      return data
    },
    onSuccess: invalidate,
  })
}

export function useCloseGoalMutation(projectId: string) {
  const invalidate = useInvalidateGoal(projectId)

  return useMutation({
    mutationFn: async (input: { goalId: string; reason: GoalCloseReason }) => {
      const { data } = await signOutOn401(
        apiClient.post<SpaceGoal>(
          `/api/v1/projects/${projectId}/goals/${input.goalId}/close`,
          { reason: input.reason }
        )
      )
      return data
    },
    onSuccess: invalidate,
  })
}

/** 暂停 / 恢复。两件事共用一次请求形状，因为它们的差别只在那一个动词上。 */
export function useSetGoalStatusMutation(projectId: string) {
  const invalidate = useInvalidateGoal(projectId)

  return useMutation({
    mutationFn: async (input: { goalId: string; action: 'pause' | 'resume' }) => {
      const { data } = await signOutOn401(
        apiClient.post<SpaceGoal>(
          `/api/v1/projects/${projectId}/goals/${input.goalId}/${input.action}`
        )
      )
      return data
    },
    onSuccess: invalidate,
  })
}

/**
 * 请系统读一句话，看里面有没有目标。**这是读，不是写。**
 *
 * `heard: false` 是正常回答（大多数话里没有目标）。502 是另一回事 —— 那是"没读成"，
 * 调用方必须把它和"你这句话里没有目标"分开说。
 */
export async function suggestGoal(
  projectId: string,
  message: string
): Promise<GoalSuggestion> {
  const { data } = await signOutOn401(
    apiClient.post<GoalSuggestion>(`/api/v1/projects/${projectId}/goals/extract`, {
      message,
    })
  )
  return data
}
