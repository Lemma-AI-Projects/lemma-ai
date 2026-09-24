import { browserNotificationAdapter } from './browserAdapter'
import { feedAdapter } from './feedAdapter'
import type { Notification, NotificationInput } from './types'

/**
 * Notification Sender — the one way anything tells the learner something.
 *
 * `send()` is the whole interface, and it is the seam the rest of the product is
 * expected to use:
 *
 *     Scheduler ─┐
 *     Coordinator ├─► notificationSender.send({ title, body, type })
 *     Global Agent┘
 *
 * Nobody outside this module touches the Feed's rows. A producer that wrote them
 * itself would be a second definition of "what the learner was told" — and the
 * Feed would then have two owners and no way to reconcile them.
 *
 * The sender knows nobody: it imports two channels and nothing else. No Learn
 * Space, no Learner State, no Method, no Scheduler — the decision about *what*
 * to send is made upstream; this module only delivers it.
 *
 * Channel discipline:
 *  - the Feed channel is awaited and authoritative. If the row does not land,
 *    `send()` rejects and the caller knows nothing was delivered.
 *  - the browser channel is fired after, best effort. A denied permission (or a
 *    browser without the API) is a normal state — the learner still gets the
 *    feed item.
 */
export const notificationSender = {
  channels: [feedAdapter, browserNotificationAdapter] as const,

  async send(input: NotificationInput): Promise<Notification> {
    const sent = await feedAdapter.deliver(input)
    // Deliberately after the Feed write, and deliberately not awaited as a
    // failure path: the system notification must never be able to delay or
    // endanger the feed item.
    browserNotificationAdapter.deliver(sent)
    return sent
  },
}

/** `send(notification)` for callers that prefer a bare function. */
export const sendNotification = (input: NotificationInput) =>
  notificationSender.send(input)
