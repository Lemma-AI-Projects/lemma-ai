import { cn } from '@/lib/utils'
import type { CourseCompanionConversation } from './courseCompanionApi'

export function CourseConversationPills({
  activeConversationId,
  conversations,
  isError = false,
  isLoading = false,
  onSelectConversation,
}: {
  activeConversationId?: string
  conversations: CourseCompanionConversation[]
  isError?: boolean
  isLoading?: boolean
  onSelectConversation?: (conversationId: string) => void
}) {
  if (isLoading) {
    return (
      <span className="shrink-0 rounded-full bg-zinc-200/70 px-2.5 py-1 text-xs font-medium text-zinc-400">
        加载中…
      </span>
    )
  }

  if (isError) {
    return (
      <span className="shrink-0 rounded-full bg-zinc-200/70 px-2.5 py-1 text-xs font-medium text-zinc-500">
        加载失败
      </span>
    )
  }

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
          title={conversation.title ?? '新对话'}
        >
          {conversation.title ?? '新对话'}
        </button>
      ))}
    </div>
  )
}
