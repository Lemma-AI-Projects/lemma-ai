import { chatMessages } from '@/mock/chatMessages'
import { createConversationTurns } from './createConversationTurns'
import type { ConversationTurn } from './types'

export function getConversationTurns(chatId?: string): ConversationTurn[] {
  if (!chatId) {
    return []
  }

  const messages = chatMessages[chatId]

  if (!messages) {
    return []
  }

  return createConversationTurns(chatId, messages)
}
