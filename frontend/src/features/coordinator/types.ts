/**
 * The Coordinator's contract, mirrored from the backend.
 *
 * A decision is `{action, target, reason, urgency, payload}` — never user-facing
 * copy. The panel shows it verbatim, which is the point: the decision layer must
 * be inspectable, and the shortest way to make it inspectable is to render what
 * it actually returned.
 */

export type CoordinatorAction =
  | 'NO_ACTION'
  | 'CONTINUE'
  | 'REVIEW'
  | 'INTRODUCE'
  | 'NOTIFY'

export type CoordinatorUrgency = 'low' | 'normal' | 'high'

/** Who announced the event. It is what turns a next step into a reminder. */
export type CoordinatorEventSource = 'chat' | 'api'

/** One row of the decision log (`GET /coordinator/decisions`). */
export interface CoordinatorDecisionRecord {
  id: string
  projectId: string | null
  eventType: string
  eventPayload: Record<string, unknown>
  action: CoordinatorAction
  target: string | null
  reason: string
  urgency: CoordinatorUrgency
  /** What the executor did: nothing_to_do / handed_to_global_agent / notification_sent:… */
  effect: string
  createdAt: string
}

export interface CoordinatorFocusItem {
  id: string
  label: string
  /** mastered | not_mastered | unassessed */
  value: string
  origin: string | null
  evidenceCount: number
  lastConfirmedAt: string | null
  /** The value before the event's evidence — what separates a lapse from a struggle. */
  previousValue: string
}

export interface CoordinatorEvent {
  type: string
  payload: Record<string, unknown>
  source: CoordinatorEventSource
}

export interface CoordinatorEvidenceFact {
  itemLabel: string
  verdict: string
  tier: string
  createdAt: string | null
}

/** Everything the decision was allowed to look at. */
export interface CoordinatorSnapshot {
  event: CoordinatorEvent
  currentTime: string
  spaceId: string | null
  focus: CoordinatorFocusItem | null
  mastered: string[]
  ready: string[]
  developing: string[]
  unassessedCount: number
  recentEvidence: CoordinatorEvidenceFact[]
  recentMemory: string[]
  availableActions: CoordinatorAction[]
  goal: string | null
}

export interface CoordinatorDecision {
  action: CoordinatorAction
  target: string | null
  reason: string
  urgency: CoordinatorUrgency
  payload: Record<string, unknown>
}

/** A dry run: what it would decide now, with nothing executed. */
export interface CoordinatorExplanation {
  snapshot: CoordinatorSnapshot
  decision: CoordinatorDecision
}

/** One piece of evidence, as the write path takes it. */
export interface EvidenceInput {
  projectId: string
  itemId: string
  /** correct | incorrect */
  verdict: 'correct' | 'incorrect'
  /** A = deterministic check, B = rubric-judged (needs two records to settle). */
  tier: 'A' | 'B'
  reasoning: string
}
