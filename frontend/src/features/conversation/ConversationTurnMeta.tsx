import { cn } from '@/lib/utils'
import type { ConversationTurnMetaData, ConversationTurnVariant } from './types'

export function ConversationTurnMeta({
  meta,
  variants,
  align = 'start',
}: {
  meta?: ConversationTurnMetaData
  variants?: ConversationTurnVariant[]
  align?: 'start' | 'end'
}) {
  if (!meta && !variants?.length) {
    return null
  }

  return (
    <div
      data-slot="conversation-turn-meta"
      className={cn('flex w-full', align === 'end' ? 'justify-end' : 'justify-start')}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {meta?.label ? <span>{meta.label}</span> : null}
        {meta?.description ? <span>{meta.description}</span> : null}
        {variants?.map((variant) => (
          <span
            key={variant.id}
            data-active={variant.isActive ? 'true' : 'false'}
          >
            {variant.label}
          </span>
        ))}
      </div>
    </div>
  )
}
