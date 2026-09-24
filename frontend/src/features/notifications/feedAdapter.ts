import { queryClient } from '@/lib/queryClient'
import { notificationsQueryKey, postNotification } from './notificationApi'
import type { Notification, NotificationInput } from './types'

/**
 * The Feed channel: the authoritative one.
 *
 * "Delivering" to the in-app feed means persisting the notification and telling
 * the open page to refetch — not pushing it into an array in memory. That is why
 * a notification survives a refresh, and why this is the channel whose failure
 * is a real failure: if the write does not land, `send()` throws and the caller
 * finds out, instead of the UI showing an item that the next reload loses.
 *
 * It writes through the API, not through the Calendar's own state: the feed data
 * layer stays the only owner of feed rows.
 */
export const feedAdapter = {
  name: 'in-app-feed',

  async deliver(input: NotificationInput): Promise<Notification> {
    const sent = await postNotification(input)
    // Every mounted Feed refetches; the new item appears in its date cell and
    // in today's list without either component knowing a send happened.
    void queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
    return sent
  },
}
