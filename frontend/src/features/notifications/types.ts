/**
 * The Notification contract, mirrored from the backend.
 *
 * Deliberately the minimal shape the sender works with — id, title, body, type,
 * timestamp, metadata — and nothing else. The moment this grows a "read",
 * "priority", "channel" or "actions" field, the sender has started becoming a
 * notification framework, and the Feed would have to render concepts no
 * producer sets.
 *
 * `type` is a closed union because it drives how the feed styles the item; the
 * backend owns the same set (`services/notification_service.NOTIFICATION_TYPES`)
 * and refuses anything else, so the two cannot drift silently.
 */
export type NotificationType = 'reminder' | 'notification' | 'system'

/** What a caller hands to `send()` — the id and the stored time are not theirs. */
export interface NotificationInput {
  title: string
  body?: string
  type?: NotificationType
  /** ISO 8601. Absent means "now", decided by the database. */
  timestamp?: string
  /** Free-form context for future producers; the feed renders none of it. */
  metadata?: Record<string, unknown>
}

/** A notification that exists — what `GET /api/v1/notifications` returns. */
export interface Notification {
  id: string
  title: string
  body: string
  type: NotificationType
  /** ISO 8601. The feed orders and places items by this. */
  timestamp: string
  metadata: Record<string, unknown>
}
