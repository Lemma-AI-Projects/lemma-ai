import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import type { Notification, NotificationInput } from './types'

/**
 * The feed's notification data — one root key, one list.
 *
 * There is no per-item key and no filtering: the feed shows what the learner was
 * told, newest first, and the page slices by date itself. A second key here
 * would be a second source of truth about the same rows.
 */
export const notificationsQueryKey = ['notifications'] as const

/** Every notification this user has, newest first. */
export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await signOutOn401(
    apiClient.get<Notification[]>('/api/v1/notifications')
  )
  return data
}

/**
 * `send()` over HTTP. Not wrapped in a mutation hook on purpose: the sender is
 * called from the notification sender module (and, later, from a Scheduler),
 * not from render — a hook would tie delivery to a component's lifetime.
 */
export async function postNotification(
  input: NotificationInput
): Promise<Notification> {
  const { data } = await signOutOn401(
    apiClient.post<Notification>('/api/v1/notifications', input)
  )
  return data
}

/** The feed's read side. Refetches when the sender invalidates the key. */
export function useNotificationsQuery() {
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: fetchNotifications,
    retry: retryUnlessClientError,
    // It polls while the page is open: V0 has no push channel for in-app items,
    // and the Scheduler fires a task SERVER-side — without this, the reminder for
    // a scheduled task would only appear on the next manual refresh, which is
    // precisely what the "wait 30 seconds and watch it arrive" test must not need.
    refetchInterval: 5_000,
  })
}
