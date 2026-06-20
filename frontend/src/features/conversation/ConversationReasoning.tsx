import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import { cn } from '@/lib/utils'

function getThinkingMessage(isStreaming: boolean, duration?: number) {
  if (isStreaming || duration === 0) {
    return <span className="animate-pulse">Thinking...</span>
  }
  if (duration === undefined) {
    return <span>Thought process</span>
  }
  return <span>Thought for {duration}s</span>
}

export function ConversationReasoning({
  className,
  content,
  defaultOpen,
  isStreaming = false,
}: {
  className?: string
  content: string
  defaultOpen?: boolean
  isStreaming?: boolean
}) {
  const hasContent = content.trim().length > 0
  if (!hasContent && !isStreaming) {
    return null
  }

  return (
    <Reasoning
      data-slot="conversation-reasoning"
      className={cn('mb-0 w-full max-w-[44rem]', className)}
      defaultOpen={defaultOpen ?? isStreaming}
      isStreaming={isStreaming}
    >
      <ReasoningTrigger
        getThinkingMessage={getThinkingMessage}
        className="h-7 w-fit gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-800"
      />
      {hasContent ? (
        <ReasoningContent className="mt-2 border-l border-zinc-200 pl-4 text-[13px] leading-6 text-zinc-500">
          {content}
        </ReasoningContent>
      ) : null}
    </Reasoning>
  )
}
