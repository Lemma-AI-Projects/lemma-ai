import { useState, type KeyboardEvent } from 'react'
import { ArrowUp, BookOpenCheck } from 'lucide-react'
import { InputAddMenu } from '@/components/InputAddMenu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Home input plus button left offset. Negative margin moves it further left.
const HOME_PLUS_LEFT_OFFSET_CLASS = 'ml-[-3px]'

// Home input plus button bottom offset. Negative margin moves it further down.
const HOME_PLUS_BOTTOM_OFFSET_CLASS = 'mb-[-5px]'

// Home add menu horizontal offset. Aligns the menu left edge with the input border.
const HOME_ADD_MENU_ALIGN_OFFSET = -14

export function ChatInput({
  className,
  onSend,
}: {
  className?: string
  onSend: (text: string) => void
}) {
  const [value, setValue] = useState('')
  const hasContent = value.trim().length > 0

  const submit = () => {
    const text = value.trim()
    if (!text) {
      return
    }
    onSend(text)
    setValue('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Shift+Enter 换行；输入法候选确认（composing）不触发发送
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-[26px] border border-zinc-200 bg-white',
        className
      )}
    >
      <textarea
        placeholder="Ask anything about this lesson..."
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="scrollbar-hidden max-h-[calc(6*1.625em+1.5rem)] min-h-20 w-full resize-none overflow-y-auto border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400"
        style={{ fieldSizing: 'content' } as React.CSSProperties}
      />

      <div className="flex items-center gap-2 px-4 pt-1 pb-4">
        <div
          className={cn(
            HOME_PLUS_BOTTOM_OFFSET_CLASS,
            HOME_PLUS_LEFT_OFFSET_CLASS,
            'flex items-center gap-2'
          )}
        >
          <InputAddMenu
            contextLabel="Include page context"
            menuAlignOffset={HOME_ADD_MENU_ALIGN_OFFSET}
            planningIcon={BookOpenCheck}
            planningLabel="Course Planning"
            referenceLabel="Reference materials"
          />
        </div>

        <div className="mb-[-4px] ml-auto mr-[-4px]">
          <Button
            type="button"
            variant="default"
            size="icon"
            disabled={!hasContent}
            onClick={submit}
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
