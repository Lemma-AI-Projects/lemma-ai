import { chatMessages, type ChatMessage } from '@/mock/chatMessages'
import type { ConversationTurn, ConversationTurnBlock } from './types'

function createTurnBlocks(
  chatId: string,
  message: ChatMessage,
  messageIndex: number
): ConversationTurnBlock[] {
  const blockId = `${chatId}-${messageIndex}-block-0`

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

export function getConversationTurns(chatId?: string): ConversationTurn[] {
  if (!chatId) {
    return []
  }

  const messages = chatMessages[chatId]

  if (!messages) {
    return []
  }

  return [...messages]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((message, messageIndex) => ({
      id: `${chatId}-${messageIndex}-${message.role}`,
      role: message.role,
      createdAt: message.date,
      attachments: message.attachments ?? [],
      blocks: createTurnBlocks(chatId, message, messageIndex),
    }))
}
