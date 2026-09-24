import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import { notificationsQueryKey } from '@/features/notifications/notificationApi'
import type { ScheduledTask, ScheduledTaskInput } from './types'

/**
 * The plan's data — one key, one list, ordered by `runAt` (a plan reads
 * forwards; the notification feed is the one that reads newest-first).
 *
 * There is no per-item key: the Calendar wants the whole plan, and a second key
 * would be a second source of truth about the same rows.
 */
export const scheduledTasksQueryKey = ['scheduled-tasks'] as const

/**
 * How often the open page re-reads the plan while a task is coming.
 *
 * V0 has no push channel for in-app items, so waiting for a scheduled task to
 * fire means asking again. 5s is the resolution of "it appeared": the Scheduler
 * itself polls every 5s, so a 30-second demo shows the notification within ~10s
 * of its time, without a refresh. (The browser-notification channel is the one
 * that arrives on its own.)
 */
export const SCHEDULER_POLL_MS = 5_000

export async function fetchScheduledTasks(): Promise<ScheduledTask[]> {
  const { data } = await signOutOn401(
    apiClient.get<ScheduledTask[]>('/api/v1/scheduled-tasks')
  )
  return data
}

export async function postScheduledTask(
  input: ScheduledTaskInput
): Promise<ScheduledTask> {
  const { data } = await signOutOn401(
    apiClient.post<ScheduledTask>('/api/v1/scheduled-tasks', input)
  )
  return data
}

export async function cancelScheduledTask(id: string): Promise<ScheduledTask> {
  const { data } = await signOutOn401(
    apiClient.post<ScheduledTask>(`/api/v1/scheduled-tasks/${id}/cancel`)
  )
  return data
}

/** The Calendar's read of the plan. */
export function useScheduledTasksQuery() {
  return useQuery({
    queryKey: scheduledTasksQueryKey,
    queryFn: fetchScheduledTasks,
    retry: retryUnlessClientError,
    refetchInterval: SCHEDULER_POLL_MS,
  })
}

/**
 * Create a task. Used by the dev control today; a Global Agent would call
 * `schedule()` server-side instead, and this hook would stay a UI convenience.
 */
export function useScheduleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ScheduledTaskInput) => postScheduledTask(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scheduledTasksQueryKey })
    },
  })
}

/**
 * Take a promise back. Invalidates the plan AND the notification feed: a task
 * that fires produces a notification, so the two views are never far apart.
 */
export function useCancelScheduledTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelScheduledTask(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scheduledTasksQueryKey })
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
    },
  })
}
