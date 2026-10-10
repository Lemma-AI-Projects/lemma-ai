/**
 * Wire shapes of User Home — the one layer that follows the learner between
 * Learn Spaces.
 *
 * `interests` / `preferences` are **confirmed** rows: facts the learner owns and
 * that every space's agent can read. `candidates` are proposals nobody has
 * answered yet — same shape, different list, because showing a proposal as a
 * fact is the one mistake this feature exists to prevent.
 */

export type HomeItemKind = 'about' | 'interest' | 'preference'
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
  /**
   * The older, single-paragraph half of About Me. Still returned and still
   * rendered — it is the only About field some accounts have — but no longer the
   * only way in: `about` below is the list a user can add to, edit and delete.
   */
  background: string | null
  about: UserHomeItem[]
  interests: UserHomeItem[]
  preferences: UserHomeItem[]
  candidates: UserHomeItem[]
}
