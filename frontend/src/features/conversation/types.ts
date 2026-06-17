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

export interface ConversationToolChapter {
  id: string
  title: string
  status?: 'not-started' | 'in-progress' | 'completed' | 'failed'
  progress?: number
}

export type ConversationToolStage =
  | 'questionnaire'
  | 'pending'
  | 'in-progress'
  | 'ready'

export interface ConversationToolQuestion {
  id: string
  title: string
  options: string[]
}

export interface ConversationToolAnswer {
  questionId: string
  answer: string
}

export interface ConversationToolUnit {
  id: string
  title: string
  chapters: ConversationToolChapter[]
  status?: 'not-started' | 'in-progress' | 'completed' | 'failed'
  progress?: number
}

export interface ConversationToolBlock {
  id: string
  type: 'tool'
  title: string
  stage?: ConversationToolStage
  questions?: ConversationToolQuestion[]
  units: ConversationToolUnit[]
  progress?: number
}

export type ConversationTurnBlock =
  | ConversationTextBlock
  | ConversationMarkdownBlock
  | ConversationToolBlock

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
