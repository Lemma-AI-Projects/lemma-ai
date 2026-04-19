import { ConversationTurn } from './ConversationTurn'
import type { ConversationTurn as ConversationTurnData } from './types'

export function ConversationMessageList({
  turns,
}: {
  turns: ConversationTurnData[]
}) {
  if (!turns.length) {
    return null
  }

  return (
    <ol
      data-slot="conversation-message-list"
      className="flex flex-col gap-8 py-6"
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
