import { useState, type CSSProperties } from 'react'
import { ArrowUp, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CourseAssistantIconButton } from './CourseAssistantIconButton'

export function CourseAssistantInput({ className }: { className?: string }) {
  const [value, setValue] = useState('')
  const hasContent = value.trim().length > 0

  return (
    <div
      className={cn(
        'flex flex-col rounded-[20px] border border-zinc-200 bg-white',
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

      <div className="flex items-center gap-2 px-2.5 pt-1 pb-2.5">
        <div className="flex items-center gap-1.5">
          <CourseAssistantIconButton
            type="button"
            tone="outline"
            aria-label="Attach file"
          >
            <Plus className="size-4 text-zinc-500" />
          </CourseAssistantIconButton>
        </div>

        <CourseAssistantIconButton
          type="button"
          tone="send"
          disabled={!hasContent}
          className={cn(
            'ml-auto',
            hasContent
              ? 'bg-zinc-900 hover:bg-zinc-800'
              : 'cursor-default bg-zinc-200 text-zinc-400'
          )}
          aria-label="Send message"
        >
          <ArrowUp className="size-4" />
        </CourseAssistantIconButton>
      </div>
    </div>
  )
}
