import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import { useEffect, useRef, useState } from 'react'
import { Streamdown } from 'streamdown'
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought'
import { cn } from '@/lib/utils'

const AUTO_CLOSE_DELAY = 1000
const MS_IN_S = 1000
const streamdownPlugins = { cjk, code, math, mermaid }

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
  const [isOpen, setIsOpen] = useState(defaultOpen ?? isStreaming)
  const [duration, setDuration] = useState<number | undefined>(undefined)
  const hasEverStreamedRef = useRef(isStreaming)
  const [hasAutoClosed, setHasAutoClosed] = useState(false)
  const startTimeRef = useRef<number | null>(null)

  if (isStreaming && !isOpen && defaultOpen !== false) {
    setIsOpen(true)
  }

  useEffect(() => {
    if (isStreaming) {
      hasEverStreamedRef.current = true
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now()
      }
      return
    }

    if (startTimeRef.current !== null) {
      setDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S))
      startTimeRef.current = null
    }
  }, [isStreaming])

  useEffect(() => {
    if (
      !hasEverStreamedRef.current ||
      isStreaming ||
      !isOpen ||
      hasAutoClosed
    ) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setIsOpen(false)
      setHasAutoClosed(true)
    }, AUTO_CLOSE_DELAY)

    return () => {
      window.clearTimeout(timer)
    }
  }, [hasAutoClosed, isOpen, isStreaming])

  if (!hasContent && !isStreaming) {
    return null
  }

  return (
    <ChainOfThought
      data-slot="conversation-reasoning"
      className={cn('mb-0 w-full max-w-[44rem] space-y-0', className)}
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <ChainOfThoughtHeader className="h-6 w-fit gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-800 [&>svg]:size-4">
        {getThinkingMessage(isStreaming, duration)}
      </ChainOfThoughtHeader>
      {hasContent ? (
        <ChainOfThoughtContent className="mt-[12px] space-y-1">
          <ChainOfThoughtStep
            label={
              <Streamdown
                mode={isStreaming ? 'streaming' : 'static'}
                isAnimating={isStreaming}
                parseIncompleteMarkdown={isStreaming}
                dir="auto"
                plugins={streamdownPlugins}
                className="min-w-0 text-[13px] leading-6 text-zinc-500 [&_p]:mt-[14px] [&_p:first-child]:mt-0"
              >
                {content}
              </Streamdown>
            }
            status={isStreaming ? 'active' : 'complete'}
            className="gap-2.5 text-zinc-500"
          />
        </ChainOfThoughtContent>
      ) : null}
    </ChainOfThought>
  )
}
