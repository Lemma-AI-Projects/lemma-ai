// 跨 feature 共享的 TanStack Query key 根；域内派生 key 在各 feature 的
// api 模块定义。目前仅会话列表需要跨域（项目删除后会话回落主列表，
// project 域需失效 conversation 域的列表缓存）。
export const conversationsQueryRootKey = ['conversations'] as const

// 课程域 key 根。跨域原因：coursePlanner（会话里的编排卡片）与 course
// （仪表盘 / 学习页）读的是同一份课程快照，key 必须统一，否则同一门课会
// 被缓存两次、编排结束后仪表盘拿到旧数据。
export const coursesQueryRootKey = ['courses'] as const

/** 单门课程的完整快照（GET /api/v1/courses/{id}）。 */
export function courseDetailQueryKey(courseId: string) {
  return [...coursesQueryRootKey, 'detail', courseId] as const
}

// 学习进度里跨课程的部分（周进度卡）。故意不挂 courses 前缀：它不按课程
// 划分，而课程域的前缀失效不该顺手把它冲掉。
export const progressQueryRootKey = ['progress'] as const

// 会话详情（标题/归属项目）。跨域原因：全局 hooks/useMoveConversation
// 改变归属后需要失效它。故意不挂 conversations 前缀（同 messages 的教训：
// 流结束的前缀失效不该误伤它）。
export function conversationDetailQueryKey(conversationId: string) {
  return ['conversation-detail', conversationId] as const
}
