import { type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { InputAddMenu } from '@/components/InputAddMenu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Conversation input plus button left offset. Negative margin moves it further left.
const CONVERSATION_PLUS_LEFT_OFFSET_CLASS = 'ml-[-5px]'

// Conversation input plus button bottom offset. Negative margin moves it further down.
const CONVERSATION_PLUS_BOTTOM_OFFSET_CLASS = 'mb-[-8px]'

// Conversation add menu horizontal offset. Aligns the menu left edge with the input border.
const CONVERSATION_ADD_MENU_ALIGN_OFFSET = -12

// 受控输入：value 由页面持有，便于首字前失败时把草稿还原到输入框。
export function ConversationInput({
  className,
  value,
  onValueChange,
  isStreaming,
  onSend,
  onStop,
}: {
  className?: string
  value: string
  onValueChange: (value: string) => void
  isStreaming: boolean
  onSend: (text: string) => void
  onStop: () => void
}) {
  const hasContent = value.trim().length > 0

  const submit = () => {
    const text = value.trim()
    if (!text || isStreaming) {
      return
    }
    onSend(text)
    onValueChange('')
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
        'flex flex-col rounded-3xl border border-zinc-200 bg-white',
        className
      )}
    >
      <textarea
        placeholder="Ask anything about this lesson..."
        rows={1}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={handleKeyDown}
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
            menuAlignOffset={CONVERSATION_ADD_MENU_ALIGN_OFFSET}
            referenceLabel="Reference conversation"
          />
        </div>

        <div className="mb-[-4px] ml-auto mr-[-4px]">
          <Button
            type="button"
            variant="default"
            size="icon"
            disabled={!isStreaming && !hasContent}
            onClick={isStreaming ? onStop : submit}
            className={cn(
              'rounded-full transition-colors',
              isStreaming || hasContent
                ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                : 'bg-zinc-200 text-zinc-400 cursor-default'
            )}
            aria-label={isStreaming ? 'Stop generating' : 'Send message'}
          >
            {isStreaming ? (
              <Square className="size-[13px] fill-current" />
            ) : (
              <ArrowUp className="size-[18px]" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
