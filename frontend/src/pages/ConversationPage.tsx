import { useMemo } from 'react'
import { Share2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ConversationInput } from '@/features/conversation/ConversationInput'
import { ConversationMessageList } from '@/features/conversation/ConversationMessageList'
import { ConversationMoreMenu } from '@/features/conversation/ConversationMoreMenu'
import { getConversationTurns } from '@/features/conversation/getConversationTurns'
import { chatItems } from '@/mock/chatItems'

export function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const turns = useMemo(() => getConversationTurns(id), [id])
  const conversationExists = Boolean(
    id && (chatItems.some((item) => item.id === id) || turns.length > 0)
  )

  return (
    <div className="relative flex h-full flex-col rounded-md border border-zinc-200/80 bg-zinc-50">
      <div className="absolute right-3.75 top-3.75 z-10 flex items-center gap-2.75">
        <Button
          variant="outline"
          aria-label="Share conversation"
          className="size-[34px] rounded-full bg-transparent p-0 hover:bg-muted"
        >
          <Share2 className="size-4" />
        </Button>
        <ConversationMoreMenu />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col pt-16">
        <div className="scrollbar-fade min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[55rem] flex-col px-6 pb-40">
            {turns.length > 0 ? (
              <ConversationMessageList turns={turns} />
            ) : (
              <div className="flex flex-1 items-center justify-center py-10">
                <p className="text-sm text-zinc-400">
                  {conversationExists
                    ? 'No messages yet.'
                    : `Conversation not found${id ? `: ${id}` : '.'}`}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col">
          <div className="pointer-events-auto relative z-10 px-6">
            <ConversationInput className="mx-auto w-full max-w-[52rem]" />
          </div>
          {/* Mask sits one layer below the input and is pulled up by the input's
              corner radius (rounded-3xl = 24px), so it fills the transparent
              triangular gaps at the input's bottom-left/right corners while the
              input's white shape still renders the rounded edge on top. */}
          <div aria-hidden className="relative z-0 -mt-6 px-6">
            <div className="mx-auto h-12 w-full max-w-[52rem] bg-zinc-50" />
          </div>
        </div>
      </div>
    </div>
  )
}
