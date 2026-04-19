import { cn } from '@/lib/utils'
import { ConversationAttachments } from './ConversationAttachments'
import { ConversationTurnActions } from './ConversationTurnActions'
import { ConversationTurnContent } from './ConversationTurnContent'
import { ConversationTurnMeta } from './ConversationTurnMeta'
import type { ConversationTurn as ConversationTurnData } from './types'

export function ConversationTurn({
  turn,
}: {
  turn: ConversationTurnData
}) {
  const align = turn.role === 'user' ? 'end' : 'start'

  return (
    <section
      data-slot="conversation-turn"
      data-turn-id={turn.id}
      data-turn-role={turn.role}
      data-created-at={turn.createdAt}
      className="w-full"
    >
      <div
        data-slot="conversation-turn-shell"
        className={cn('flex w-full flex-col gap-3', align === 'end' && 'items-end')}
      >
        <ConversationAttachments attachments={turn.attachments} align={align} />
        <ConversationTurnContent turn={turn} />
        <ConversationTurnMeta meta={turn.meta} variants={turn.variants} align={align} />
        <ConversationTurnActions actions={turn.actions} align={align} />
      </div>
    </section>
  )
}
