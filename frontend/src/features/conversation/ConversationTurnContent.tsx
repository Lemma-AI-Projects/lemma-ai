import { cn } from '@/lib/utils'
import { AssistantMarkdown } from './markdown'
import { ConversationCourseTool } from './ConversationCourseTool'
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

  // tool block: render the matching connected tool. Only course_planning exists
  // today; a future tool adds a branch on block.toolType here.
  return <ConversationCourseTool key={block.id} courseId={block.courseId} />
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
        // gap separates stacked blocks (e.g. the intro text and the tool card)
        // so the card reads as part of the assistant message, not pasted on.
        'flex min-w-0 flex-col gap-4',
        turn.role === 'assistant' ? 'w-full' : 'max-w-[70%]'
      )}
    >
      {turn.blocks.map(renderBlock)}
    </div>
  )
}
