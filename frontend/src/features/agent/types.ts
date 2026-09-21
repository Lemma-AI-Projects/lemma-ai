/**
 * Global Agent V0 wire types. Mirrors backend/services/agent_context_service.py.
 *
 * Two shapes, and the difference between them is the point:
 *
 * - `AgentContextDigest` is recorded ON each answer: what the agent could see
 *   when THAT answer was produced. The space changes over time, so recomputing
 *   it later would describe today's space as if it were that turn's — hence
 *   stored, not derived.
 * - `AgentContextInspector` is recomputed live for the Context Inspector and
 *   carries the literal prompt block, so "it really uses the space" can be
 *   checked by eye instead of taken on trust.
 */

export interface AgentContextSource {
  id: string
  title: string
  kind: string
  /** Characters of block text in this source (not bytes, not JSON). */
  chars: number
  /** Whether its text actually went into the prompt this turn. */
  excerpted: boolean
}

export interface AgentContextConversation {
  id: string
  title: string
}

export interface AgentContextDigest {
  space: { id: string; name: string }
  sources: AgentContextSource[]
  conversations: AgentContextConversation[]
  /** How many earlier messages of THIS conversation were replayed. */
  historyMessages: number
  promptChars: number
  excerptChars: number
  /** What the turn did: "answer", or the tool type that attached a card. */
  action: string
}

export interface AgentContextExcerpt {
  sourceId: string
  title: string
  chars: number
  truncated: boolean
  text: string
}

export interface AgentContextInspector extends AgentContextDigest {
  /** The exact text handed to the model as $space_context. */
  promptBlock: string
  excerpts: AgentContextExcerpt[]
  budget: {
    excerptTotalChars: number
    excerptPerSourceChars: number
    sourceListCap: number
  }
}
