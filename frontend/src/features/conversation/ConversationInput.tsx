import { useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { InputAddMenu } from '@/components/InputAddMenu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Conversation input plus button left offset. Negative margin moves it further left.
const CONVERSATION_PLUS_LEFT_OFFSET_CLASS = 'ml-[-5px]'

// Conversation input plus button bottom offset. Negative margin moves it further down.
const CONVERSATION_PLUS_BOTTOM_OFFSET_CLASS = 'mb-[-8px]'

export function ConversationInput({ className }: { className?: string }) {
  const [value, setValue] = useState('')
  const hasContent = value.trim().length > 0

  return (
    <div
      className={cn(
        'flex flex-col rounded-3xl border border-zinc-200 bg-white',
        className
      )}
    >
      <textarea
        placeholder="Ask anything about this lesson..."
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="scrollbar-hidden max-h-[calc(6*1.625em+1.5rem)] min-h-[68px] w-full resize-none overflow-y-auto border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400"
        style={{ fieldSizing: 'content' } as React.CSSProperties}
      />

      <div className="flex items-center gap-2 px-4 pt-1 pb-4">
        <div
          className={cn(
            CONVERSATION_PLUS_BOTTOM_OFFSET_CLASS,
            CONVERSATION_PLUS_LEFT_OFFSET_CLASS,
            'flex items-center gap-2'
          )}
        >
          <InputAddMenu
            contextLabel="Include conversation context"
            referenceLabel="Reference conversation"
          />
        </div>

        <div className="mb-[-4px] ml-auto mr-[-4px]">
          <Button
            type="button"
            variant="default"
            size="icon"
            disabled={!hasContent}
            className={cn(
              'rounded-full transition-colors',
              hasContent
                ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                : 'bg-zinc-200 text-zinc-400 cursor-default'
            )}
            aria-label="Send message"
          >
            <ArrowUp className="size-[18px]" />
          </Button>
        </div>
      </div>
    </div>
  )
}
