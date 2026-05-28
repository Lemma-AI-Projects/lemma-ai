import { useState, type CSSProperties } from 'react'
import { ArrowUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CourseAssistantInput({ className }: { className?: string }) {
  const [value, setValue] = useState('')
  const hasContent = value.trim().length > 0

  return (
    <div
      className={cn(
        'flex flex-col rounded-[22px] border border-zinc-200 bg-white',
        className
      )}
    >
      <textarea
        placeholder="Ask about this course..."
        rows={1}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="scrollbar-hidden max-h-24 min-h-16 w-full resize-none overflow-y-auto border-0 bg-transparent px-3.5 pt-3.5 pb-1.5 text-sm leading-6 text-zinc-900 outline-none placeholder:text-zinc-400"
        style={{ fieldSizing: 'content' } as CSSProperties}
      />

      <div className="flex items-center gap-2 px-3.5 pt-1 pb-3">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-full border-zinc-200"
            aria-label="Attach file"
          >
            <Plus className="size-4 text-zinc-500" />
          </Button>
        </div>

        <Button
          type="button"
          variant="default"
          size="icon-sm"
          disabled={!hasContent}
          className={cn(
            'ml-auto rounded-full transition-colors',
            hasContent
              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
              : 'cursor-default bg-zinc-200 text-zinc-400'
          )}
          aria-label="Send message"
        >
          <ArrowUp className="size-4" />
        </Button>
      </div>
    </div>
  )
}
