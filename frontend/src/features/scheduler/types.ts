/**
 * The Scheduler's contract, mirrored from the backend.
 *
 * A task is a *promise*: `runAt` is when it must happen, `type` + `payload` is
 * what must happen, `status` says whether it still has to. The feed renders the
 * promise while it is pending, and the notification it produces once it fires —
 * the two are different items and this type is only the first.
 */

/** One handler exists today; a type with no handler is refused at schedule time. */
export type ScheduledTaskType = 'notification'

/**
 * `pending` is the only state the Calendar shows. `executed` and `failed` are
 * terminal (what happened, not what will), and `cancelled` is a promise taken
 * back — all three are history.
 */
export type ScheduledTaskStatus = 'pending' | 'executed' | 'failed' | 'cancelled'

/** What a notification task carries — the Scheduler passes it on untouched. */
export interface NotificationTaskPayload {
  title: string
  body?: string
  metadata?: Record<string, unknown>
}

export interface ScheduledTask {
  id: string
  /** ISO 8601 with an offset: the Calendar places the item by this. */
  runAt: string
  type: ScheduledTaskType
  payload: NotificationTaskPayload
  status: ScheduledTaskStatus
  createdAt: string
  /** When it actually fired — null until then, and not the same fact as runAt. */
  executedAt: string | null
  /** Why it failed, if it did. V0 never retries. */
  error: string | null
}

/** What a caller sends to `schedule()`. */
export interface ScheduledTaskInput {
  runAt: string
  type?: ScheduledTaskType
  payload: NotificationTaskPayload
}
