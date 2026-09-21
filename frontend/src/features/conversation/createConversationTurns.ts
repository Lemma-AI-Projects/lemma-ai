import type { AgentContextDigest } from '@/features/agent/types'
import type {
  ConversationToolRef,
  ConversationTurn,
  ConversationTurnBlock,
  ConversationTurnRole,
} from './types'

export interface ConversationSourceMessage {
  role: ConversationTurnRole
  message: string
  date: string
  attachments?: ConversationTurn['attachments']
  /** Provider-returned thinking/reasoning track, shown separately from body text. */
  reasoningText?: string | null
  /** Tool card attached to an assistant turn (renders after its text). */
  tool?: ConversationToolRef
  /** What the agent could see for this answer (rendered last, collapsed). */
  agentContext?: AgentContextDigest
}

function createTurnBlocks(
  conversationId: string,
  message: ConversationSourceMessage,
  messageIndex: number
): ConversationTurnBlock[] {
  const baseId = `${conversationId}-${messageIndex}`

  if (message.role !== 'assistant') {
    return [{ id: `${baseId}-block-0`, type: 'text', content: message.message }]
  }

  // Assistant turn: reasoning first, then text, then any tool card.
  const blocks: ConversationTurnBlock[] = []
  if (message.reasoningText?.trim()) {
    blocks.push({
      id: `${baseId}-reasoning`,
      type: 'reasoning',
      content: message.reasoningText,
    })
  }
  if (message.message.length > 0) {
    blocks.push({ id: `${baseId}-block-0`, type: 'markdown', content: message.message })
  }
  if (message.tool) {
    blocks.push({
      id: `${baseId}-tool`,
      type: 'tool',
      tool: message.tool,
    })
  }
  // Last: it is evidence about the answer above it, not part of it.
  if (message.agentContext) {
    blocks.push({
      id: `${baseId}-agent-context`,
      type: 'agent_context',
      context: message.agentContext,
    })
  }
  // Never emit an empty turn (defensive — assistant turns always carry content).
  if (blocks.length === 0) {
    blocks.push({ id: `${baseId}-block-0`, type: 'markdown', content: message.message })
  }
  return blocks
}

export function createConversationTurns(
  conversationId: string,
  messages: ConversationSourceMessage[]
): ConversationTurn[] {
  return [...messages]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((message, messageIndex) => ({
      id: `${conversationId}-${messageIndex}-${message.role}`,
      role: message.role,
      createdAt: message.date,
      attachments: message.attachments ?? [],
      blocks: createTurnBlocks(conversationId, message, messageIndex),
    }))
}
