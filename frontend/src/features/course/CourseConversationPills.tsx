import { courseConversationItems } from '@/mock/courseConversationItems'
import { courseItems } from '@/mock/courseItems'

export function CourseConversationPills({ courseId }: { courseId?: string }) {
  const course = courseItems.find((item) => item.id === courseId)
  const conversations =
    course?.conversationIds
      .map((conversationId) =>
        courseConversationItems.find((item) => item.id === conversationId)
      )
      .filter((item) => item !== undefined) ?? []

  if (conversations.length === 0) {
    return (
      <span className="shrink-0 rounded-full bg-zinc-200/70 px-2.5 py-1 text-xs font-medium text-zinc-600">
        新对话
      </span>
    )
  }

  return (
    <div className="scrollbar-hidden flex min-w-0 items-center gap-1 overflow-x-auto">
      {conversations.map((conversation) => (
        <span
          key={conversation.id}
          className="max-w-32 shrink-0 truncate rounded-full bg-zinc-200/70 px-2.5 py-1 text-xs font-medium text-zinc-600"
          title={conversation.title}
        >
          {conversation.title}
        </span>
      ))}
    </div>
  )
}
