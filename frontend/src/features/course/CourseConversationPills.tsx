import { courseConversationItems } from '@/mock/courseConversationItems'
import { courseItems } from '@/mock/courseItems'
import { cn } from '@/lib/utils'

export function CourseConversationPills({
  activeConversationId,
  courseId,
  onSelectConversation,
}: {
  activeConversationId?: string
  courseId?: string
  onSelectConversation?: (conversationId: string) => void
}) {
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
        <button
          key={conversation.id}
          type="button"
          aria-pressed={conversation.id === activeConversationId}
          className={cn(
            'max-w-32 shrink-0 truncate rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
            conversation.id === activeConversationId
              ? 'bg-zinc-300/80 text-zinc-800'
              : 'bg-zinc-200/70 text-zinc-600 hover:bg-zinc-300/70 hover:text-zinc-800'
          )}
          onClick={() => onSelectConversation?.(conversation.id)}
          title={conversation.title}
        >
          {conversation.title}
        </button>
      ))}
    </div>
  )
}
