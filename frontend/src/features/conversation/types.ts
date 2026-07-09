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

export interface ConversationReasoningBlock {
  id: string
  type: 'reasoning'
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
  | 'searching'
  | 'materializing'
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

// Wire/persistence shape of a tool attached to a turn (matches the backend SSE
// `tool` event and ai_messages.tool_json). `type` discriminates the tool.
export type ConversationToolRef =
  | { type: 'course_planning'; courseId: string }
  | { type: 'desmos_graph'; graphId: string }

// A tool block is a thin REFERENCE: which tool sits in this turn and which
// resource it drives. The card hydrates its own live data from that id, so the
// same block renders identically live and on history reload. `tool.type`
// discriminates the card component to render.
export interface ConversationToolBlock {
  id: string
  type: 'tool'
  tool: ConversationToolRef
}

export type ConversationTurnBlock =
  | ConversationTextBlock
  | ConversationMarkdownBlock
  | ConversationReasoningBlock
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
