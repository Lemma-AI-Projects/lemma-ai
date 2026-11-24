// 跨 feature 共享的 TanStack Query key 根；域内派生 key 在各 feature 的
// api 模块定义。目前仅会话列表需要跨域（项目删除后会话回落主列表，
// project 域需失效 conversation 域的列表缓存）。
export const conversationsQueryRootKey = ['conversations'] as const

// 会话详情（标题/归属项目）。跨域原因：全局 hooks/useMoveConversation
// 改变归属后需要失效它。故意不挂 conversations 前缀（同 messages 的教训：
// 流结束的前缀失效不该误伤它）。
export function conversationDetailQueryKey(conversationId: string) {
  return ['conversation-detail', conversationId] as const
}
