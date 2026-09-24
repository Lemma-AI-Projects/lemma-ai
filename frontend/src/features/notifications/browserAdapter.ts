// Aliased: this module needs the DOM's `Notification` constructor as well, and
// the two must not be confused for one another.
import type { Notification as FeedNotification } from './types'

/**
 * The browser channel: system-level notification, best effort.
 *
 * Three rules, and they are the whole point of this module being separate from
 * the Feed channel:
 *
 *  1. **Never ask, never assume.** `deliver()` only fires when permission is
 *     already `granted`. It never calls `requestPermission()` — that must happen
 *     on a user gesture (the test button calls `ensurePermission()`), because a
 *     prompt fired from a background code path is a prompt the learner refuses.
 *  2. **Never throw.** An unsupported browser, a denied permission or a
 *     constructor that fails must not fail `send()`. The Feed row is already
 *     written; a system toast is a bonus, not part of the contract.
 *  3. **Never `window.alert()`.** One blocking modal is not a notification.
 */

function notificationApi(): typeof Notification | null {
  // `Notification` is absent in some embedded webviews and in SSR.
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }
  return window.Notification
}

function isSupported(): boolean {
  return notificationApi() !== null
}

function permission(): NotificationPermission | 'unsupported' {
  const api = notificationApi()
  return api ? api.permission : 'unsupported'
}

/**
 * Ask the browser once, from a user gesture. Resolves to whether we may now
 * show system notifications — a refusal is a normal answer, not an error.
 */
async function ensurePermission(): Promise<boolean> {
  const api = notificationApi()
  if (!api) {
    return false
  }
  if (api.permission === 'granted') {
    return true
  }
  if (api.permission === 'denied') {
    // Denied is sticky in every current browser; asking again does nothing.
    return false
  }
  try {
    return (await api.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

function deliver(notification: FeedNotification): void {
  const api = notificationApi()
  if (!api || api.permission !== 'granted') {
    return
  }
  try {
    // `tag` is the notification id: a redelivery of the same item replaces the
    // system toast instead of stacking a duplicate next to it.
    new api(notification.title, {
      body: notification.body,
      tag: notification.id,
    })
  } catch {
    // Some browsers throw for a notification created outside a service worker
    // (e.g. on mobile). The Feed already has the item; that is enough.
  }
}

export const browserNotificationAdapter = {
  name: 'browser-notification',
  isSupported,
  permission,
  ensurePermission,
  deliver,
}
