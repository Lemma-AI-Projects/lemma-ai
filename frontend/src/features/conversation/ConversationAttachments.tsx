import {
  categoryToIconBgMap,
  categoryToIconMap,
  categoryToLabelMap,
} from '@/lib/fileType'
import { cn } from '@/lib/utils'
import type { ChatAttachment } from '@/mock/chatMessages'

export function ConversationAttachments({
  attachments,
  align = 'start',
}: {
  attachments: ChatAttachment[]
  align?: 'start' | 'end'
}) {
  if (!attachments.length) {
    return null
  }

  return (
    <ul
      data-slot="conversation-turn-attachments"
      className={cn(
        'flex w-full flex-wrap gap-2',
        align === 'end' ? 'justify-end' : 'justify-start'
      )}
    >
      {attachments.map((attachment) => {
        const Icon = categoryToIconMap[attachment.category]
        const iconBg = categoryToIconBgMap[attachment.category]
        const label = categoryToLabelMap[attachment.category]

        return (
          <li
            key={attachment.id}
            data-slot="conversation-attachment"
            data-file-category={attachment.category}
            className="min-w-0 max-w-full"
          >
            <div className="flex w-60 min-w-0 items-center gap-3 rounded-2xl border border-zinc-200 bg-transparent p-2.5">
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg',
                  iconBg
                )}
              >
                <Icon className="size-5 text-white" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {attachment.fileName}
                </p>
                <p className="truncate text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
