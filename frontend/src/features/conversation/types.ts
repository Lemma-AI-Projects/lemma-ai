import type { ChatAttachment, ChatMessage } from '@/mock/chatMessages'
import type { AgentContextDigest } from '@/features/agent/types'

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

// 编排卡片只展示 章 -> 单元 两层；单元行用「N 个学习点」交代规模，不逐条列视频
// （36rem 宽的卡片里三层缩进读不清，物料化阶段逐个视频转圈信息量也不大）。
export interface ConversationToolLesson {
  id: string
  title: string
  pointCount: number
  status?: 'not-started' | 'in-progress' | 'completed' | 'failed'
}

export type ConversationToolStage =
  | 'questionnaire'
  | 'searching'
  | 'materializing'
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

export interface ConversationToolModule {
  id: string
  title: string
  lessons: ConversationToolLesson[]
  status?: 'not-started' | 'in-progress' | 'completed' | 'failed'
}

// Wire/persistence shape of a tool attached to a turn (matches the backend SSE
// `tool` event and ai_messages.tool_json). `type` discriminates the tool.
export type ConversationToolRef =
  | { type: 'course_planning'; courseId: string }
  // A video-less course, generated from the learner's own sentence. Same ref
  // shape as course_planning (a courseId the card hydrates from) because the
  // card is a reference, not a payload: what differs is which card renders.
  | { type: 'free_course'; courseId: string }
  | { type: 'desmos_graph'; graphId: string }
  | { type: 'desmos_3d_graph'; graphId: string }

// A tool block is a thin REFERENCE: which tool sits in this turn and which
// resource it drives. The card hydrates its own live data from that id, so the
// same block renders identically live and on history reload. `tool.type`
// discriminates the card component to render.
export interface ConversationToolBlock {
  id: string
  type: 'tool'
  tool: ConversationToolRef
}

/**
 * The dev-phase record of what the Global Agent could see for one answer.
 * A thin reference like the tool block: the facts travel with the turn, so
 * live and reloaded views render identically.
 */
export interface ConversationAgentContextBlock {
  id: string
  type: 'agent_context'
  context: AgentContextDigest
}

export type ConversationTurnBlock =
  | ConversationTextBlock
  | ConversationMarkdownBlock
  | ConversationReasoningBlock
  | ConversationToolBlock
  | ConversationAgentContextBlock

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
