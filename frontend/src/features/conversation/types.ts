import type { ChatAttachment, ChatMessage } from '@/mock/chatMessages'

export type ConversationTurnRole = ChatMessage['role']

export interface ConversationTextBlock {
  id: string
  type: 'text'
  content: string
}

export interface ConversationMarkdownBlock {
  id: string
  type: 'markdown'
  content: string
}

export type ConversationTurnBlock =
  | ConversationTextBlock
  | ConversationMarkdownBlock

export interface ConversationTurnMetaData {
  label?: string
  description?: string
}

export interface ConversationTurnAction {
  id: string
  label: string
}

export interface ConversationTurnVariant {
  id: string
  label: string
  isActive?: boolean
}

export interface ConversationTurn {
  id: string
  role: ConversationTurnRole
  createdAt: string
  attachments: ChatAttachment[]
  blocks: ConversationTurnBlock[]
  meta?: ConversationTurnMetaData
  actions?: ConversationTurnAction[]
  variants?: ConversationTurnVariant[]
}
