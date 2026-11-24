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

// 编排卡片只展示 章 -> 单元 两层；单元行用「N 个学习点」交代规模，不逐条列学习点
// （36rem 宽的卡片里三层缩进读不清，准备阶段逐个转圈信息量也不大）。
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
  | { type: 'desmos_graph'; graphId: string }
  | { type: 'desmos_3d_graph'; graphId: string }
  // 测验卡片（提案）：后端尚未下发 quiz 工具。
  | { type: 'quiz'; questionSetId: string }

const KNOWN_TOOL_TYPES: Record<ConversationToolRef['type'], true> = {
  desmos_graph: true,
  desmos_3d_graph: true,
  quiz: true,
}

/**
 * 工具引用进入前端的唯一入口（历史消息与 SSE tool 事件）。不认识的类型返回
 * null，该轮只显示文字：历史数据里可能还留着已下线工具的引用（如
 * course_planning），不能因此渲染错卡片或报错。
 */
export function parseConversationToolRef(value: unknown): ConversationToolRef | null {
  if (value === null || typeof value !== 'object') return null
  const type = (value as { type?: unknown }).type
  return typeof type === 'string' && Object.hasOwn(KNOWN_TOOL_TYPES, type)
    ? (value as ConversationToolRef)
    : null
}

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
