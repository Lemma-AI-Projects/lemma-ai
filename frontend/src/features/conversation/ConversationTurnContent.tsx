import type { ComponentProps } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import type { ConversationTurn as ConversationTurnData, ConversationTurnBlock } from './types'

const markdownComponents = {
  h2: (props: ComponentProps<'h2'>) => (
    <h2 className="mt-6 text-base font-semibold first:mt-0" {...props} />
  ),
  h3: (props: ComponentProps<'h3'>) => (
    <h3 className="mt-5 text-sm font-semibold first:mt-0" {...props} />
  ),
  p: (props: ComponentProps<'p'>) => (
    <p className="mt-4 first:mt-0 whitespace-pre-wrap" {...props} />
  ),
  ul: (props: ComponentProps<'ul'>) => (
    <ul className="mt-4 list-disc pl-5 first:mt-0" {...props} />
  ),
  ol: (props: ComponentProps<'ol'>) => (
    <ol className="mt-4 list-decimal pl-5 first:mt-0" {...props} />
  ),
  li: (props: ComponentProps<'li'>) => (
    <li className="mt-1 first:mt-0" {...props} />
  ),
  blockquote: (props: ComponentProps<'blockquote'>) => (
    <blockquote className="mt-4 pl-4 text-muted-foreground first:mt-0" {...props} />
  ),
  pre: (props: ComponentProps<'pre'>) => (
    <pre className="mt-4 overflow-x-auto whitespace-pre-wrap font-mono text-[13px] leading-6 first:mt-0" {...props} />
  ),
  code: (props: ComponentProps<'code'>) => (
    <code className="font-mono text-[0.95em]" {...props} />
  ),
  hr: (props: ComponentProps<'hr'>) => (
    <hr className="my-4 border-border" {...props} />
  ),
}

function renderBlock(block: ConversationTurnBlock) {
  if (block.type === 'text') {
    return (
      <div
        key={block.id}
        data-slot="conversation-text-block"
        className="whitespace-pre-wrap rounded-[18px] bg-zinc-100 px-4 py-2.5 text-sm leading-6 text-foreground [overflow-wrap:anywhere]"
      >
        {block.content}
      </div>
    )
  }

  return (
    <div
      key={block.id}
      data-slot="conversation-markdown-block"
      className="min-w-0 text-sm leading-7 text-foreground"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {block.content}
      </ReactMarkdown>
    </div>
  )
}

export function ConversationTurnContent({
  turn,
}: {
  turn: ConversationTurnData
}) {
  return (
    <div
      data-slot="conversation-turn-content"
      data-role={turn.role}
      className={cn(
        'min-w-0',
        turn.role === 'assistant' ? 'w-full' : 'max-w-[70%]'
      )}
    >
      {turn.blocks.map(renderBlock)}
    </div>
  )
}
