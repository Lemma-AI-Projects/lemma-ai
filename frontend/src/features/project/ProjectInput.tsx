import { useState } from 'react'
import { ArrowUp, Paperclip, Sparkles, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ProjectInput({ className }: { className?: string }) {
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
        <div className="mb-[-12px] ml-[-4px] flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            aria-label="Attach file"
          >
            <Paperclip className="size-4 text-zinc-500" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-zinc-600"
          >
            <Sparkles className="size-3.5" />
            Auto
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-zinc-600"
          >
            <Wrench className="size-3.5" />
            Tools
          </Button>
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
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
