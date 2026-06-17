import { cn } from '@/lib/utils'
import { AssistantMarkdown } from './markdown'
import { ConversationToolShell } from './ConversationToolShell'
import type { ConversationTurn as ConversationTurnData, ConversationTurnBlock } from './types'

function renderBlock(block: ConversationTurnBlock) {
  if (block.type === 'text') {
    return (
      <div
        key={block.id}
        data-slot="conversation-text-block"
        className="whitespace-pre-wrap rounded-[18px] bg-zinc-100 px-4 py-2.5 font-sans text-base font-normal leading-7 text-foreground [overflow-wrap:anywhere]"
      >
        {block.content}
      </div>
    )
  }

  if (block.type === 'markdown') {
    return (
      <AssistantMarkdown key={block.id} className="text-foreground">
        {block.content}
      </AssistantMarkdown>
    )
  }

  return (
    <ConversationToolShell
      key={block.id}
      title={block.title}
      stage={block.stage ?? 'ready'}
      questions={block.questions}
      units={block.units}
      progress={block.progress}
    />
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
