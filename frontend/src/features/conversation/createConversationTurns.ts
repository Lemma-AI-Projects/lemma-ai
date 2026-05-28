import type {
  ConversationTurn,
  ConversationTurnBlock,
  ConversationTurnRole,
} from './types'

export interface ConversationSourceMessage {
  role: ConversationTurnRole
  message: string
  date: string
  attachments?: ConversationTurn['attachments']
}

function createTurnBlocks(
  conversationId: string,
  message: ConversationSourceMessage,
  messageIndex: number
): ConversationTurnBlock[] {
  const blockId = `${conversationId}-${messageIndex}-block-0`

  if (message.role === 'assistant') {
    return [
      {
        id: blockId,
        type: 'markdown',
        content: message.message,
      },
    ]
  }

  return [
    {
      id: blockId,
      type: 'text',
      content: message.message,
    },
  ]
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
