import { cn } from '@/lib/utils'
import { ConversationTurn } from './ConversationTurn'
import type { ConversationTurn as ConversationTurnData } from './types'

export function ConversationMessageList({
  className,
  turns,
}: {
  className?: string
  turns: ConversationTurnData[]
}) {
  if (!turns.length) {
    return null
  }

  return (
    <ol
      data-slot="conversation-message-list"
      className={cn('flex flex-col gap-8 py-6', className)}
    >
      {turns.map((turn) => (
        <li
          key={turn.id}
          data-slot="conversation-message-list-item"
          className="list-none"
        >
          <ConversationTurn turn={turn} />
        </li>
      ))}
    </ol>
  )
}
