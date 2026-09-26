/**
 * Wire shapes of User Home — the one layer that follows the learner between
 * Learn Spaces.
 *
 * `interests` / `preferences` are **confirmed** rows: facts the learner owns and
 * that every space's agent can read. `candidates` are proposals nobody has
 * answered yet — same shape, different list, because showing a proposal as a
 * fact is the one mistake this feature exists to prevent.
 */

export type HomeItemKind = 'interest' | 'preference'
export type HomeItemStatus = 'candidate' | 'confirmed'

export interface UserHomeItem {
  id: string
  kind: HomeItemKind
  text: string
  status: HomeItemStatus
  /** `agent` rows keep this after confirmation: "the agent suggested it" stays visible. */
  origin: 'user' | 'agent'
  sourceSpaceId: string | null
  createdAt: string
  confirmedAt: string | null
}

export interface UserHome {
  /** Lives in `profiles`; shown here because it is the same person. */
  nickname: string | null
  language: string | null
  background: string | null
  interests: UserHomeItem[]
  preferences: UserHomeItem[]
  candidates: UserHomeItem[]
}
