import { Share2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ConversationInput } from '@/features/conversation/ConversationInput'
import { ConversationMoreMenu } from '@/features/conversation/ConversationMoreMenu'

export function ConversationPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="relative flex h-full flex-col rounded-md border border-zinc-200/80 bg-zinc-50">
      <div className="absolute right-4 top-4 flex items-center gap-3">
        <Button
          variant="outline"
          aria-label="Share conversation"
          className="h-9 rounded-full bg-transparent px-3 hover:bg-muted"
        >
          <Share2 className="size-4" />
          <span className="text-sm font-medium">Share</span>
        </Button>
        <ConversationMoreMenu />
      </div>
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-zinc-400">Conversation: {id}</p>
      </div>
      <div className="px-6 pb-6">
        <ConversationInput className="mx-auto w-full max-w-[48rem]" />
      </div>
    </div>
  )
}
