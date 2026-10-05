// Connect 页的数据形状。本阶段全部由 connectMock.ts 喂，不接后端。
//
// 术语按设计稿的读法：Connect 是一个**页面**，左上角是**页面切换器** ——
// 下拉里列的就是 ConnectPage（默认 Public Hall，下面挂用户自建的页）。
// 「子页面」= 选中某个 ConnectPage 之后，内容区里看到的那一屏。

export type ConnectPageKind = 'hall' | 'group' | 'class' | 'custom'

export interface ConnectPage {
  id: string
  name: string
  kind: ConnectPageKind
  /** 一句话说明，出现在下拉与内容区标题下 */
  subtitle: string
  /** 头像色块，沿用 UserAvatar 的 color 约定 */
  color: string
  memberCount: number
  /** 是不是"我"建的：决定下拉里归到「我创建的」还是「公共」 */
  ownedByMe: boolean
}

export type ConnectMemberRole = 'owner' | 'assistant' | 'member'

export interface ConnectMember {
  id: string
  name: string
  color: string
  role: ConnectMemberRole
  headline: string
  online: boolean
}

export type ConnectFeedKind = 'note' | 'question' | 'resource' | 'achievement' | 'announcement'

export interface ConnectReaction {
  emoji: string
  count: number
}

export interface ConnectFeedItem {
  id: string
  kind: ConnectFeedKind
  author: ConnectMember
  /** ISO 字符串；显示时换算成相对时间 */
  createdAt: string
  title: string | null
  body: string
  tags: string[]
  reactions: ConnectReaction[]
  commentCount: number
  pinned: boolean
}

export interface ConnectMessage {
  id: string
  author: ConnectMember
  body: string
  createdAt: string
  fromMe: boolean
}

export interface ConnectAchievement {
  id: string
  title: string
  description: string
  /** 单字或 emoji，做成徽章 */
  glyph: string
  earnedAt: string | null
  progress: { current: number; total: number } | null
}

/** 每个页自带一个助手：设计稿明确它 ≠ global agent ≠ free course agent */
export interface ConnectAssistant {
  name: string
  note: string
}

/** 主区的两个分区。页面按 Classroom / Project 分区，一屏里并排摆开。 */
export type ConnectPartitionId = 'classroom' | 'project'

export interface ConnectPartition {
  id: ConnectPartitionId
  name: string
  subtitle: string
  feed: ConnectFeedItem[]
  members: ConnectMember[]
  messages: ConnectMessage[]
  achievements: ConnectAchievement[]
}

export interface ConnectPageContent {
  page: ConnectPage
  assistant: ConnectAssistant
  partitions: ConnectPartition[]
}

/** 右侧小菜单里的四块内容（原横向标签行，现为侧栏子选项） */
export type ConnectBlock = 'feed' | 'members' | 'chat' | 'achievements'

/** 原型调试用：四态由预览页顶部的开关切换，不接真实数据源 */
export type ConnectViewState = 'default' | 'empty' | 'loading' | 'error'
