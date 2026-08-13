import { cn } from '@/lib/utils'
import type { ConversationTurnAction } from './types'

export function ConversationTurnActions({
  actions,
  align = 'start',
}: {
  actions?: ConversationTurnAction[]
  align?: 'start' | 'end'
}) {
  if (!actions?.length) {
    return null
  }

  return (
    <div
      data-slot="conversation-turn-actions"
      className={cn('flex w-full', align === 'end' ? 'justify-end' : 'justify-start')}
    >
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={action.onSelect}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
