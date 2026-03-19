import { useState } from 'react'
import { ArrowUp, Paperclip, Sparkles, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ChatInput({ className }: { className?: string }) {
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
        className="scrollbar-hidden max-h-[calc(6*1.625em+1.5rem)] min-h-20 w-full resize-none overflow-y-auto border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400"
        style={{ fieldSizing: 'content' } as React.CSSProperties}
      />

      <div className="flex items-center gap-2 px-4 pt-1 pb-4">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-full border-zinc-200"
          aria-label="Attach file"
        >
          <Paperclip className="size-4 text-zinc-500" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-zinc-200 text-zinc-600"
        >
          <Sparkles className="size-3.5" />
          Auto
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-zinc-200 text-zinc-600"
        >
          <Wrench className="size-3.5" />
          Tools
        </Button>

        <div className="ml-auto">
          <Button
            type="button"
            variant="default"
            size="icon-sm"
            disabled={!hasContent}
            className={cn(
              'rounded-full transition-colors',
              hasContent
                ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                : 'bg-zinc-200 text-zinc-400 cursor-default'
            )}
            aria-label="Send message"
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
