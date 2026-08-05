import { DesmosGraphCard } from '@/features/desmos/DesmosGraphCard'
import { cn } from '@/lib/utils'
import { AssistantMarkdown } from './markdown'
import { ConversationCourseTool } from './ConversationCourseTool'
import { ConversationReasoning } from './ConversationReasoning'
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

  if (block.type === 'reasoning') {
    return <ConversationReasoning key={block.id} content={block.content} />
  }

  if (block.type === 'markdown') {
    return (
      <AssistantMarkdown key={block.id} className="text-foreground">
        {block.content}
      </AssistantMarkdown>
    )
  }

  // tool block: render the matching connected card by tool type. Adding a
  // tool = adding a branch here (the ref shape is a discriminated union).
  // Both graph kinds share one card component — it reads the graph's `kind`
  // from the GET response (DB truth) to pick the calculator constructor.
  if (
    block.tool.type === 'desmos_graph' ||
    block.tool.type === 'desmos_3d_graph'
  ) {
    return <DesmosGraphCard key={block.id} graphId={block.tool.graphId} />
  }
  return <ConversationCourseTool key={block.id} courseId={block.tool.courseId} />
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
        turn.role === 'assistant'
          ? "w-full [&>[data-slot='conversation-reasoning']+*]:-mt-1.5"
          : 'max-w-[70%]'
      )}
    >
      {turn.blocks.map(renderBlock)}
    </div>
  )
}
