import type { ComponentProps, ReactNode, Ref } from 'react'
import { Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConversationInput } from './ConversationInput'

export function ConversationLayout({
  children,
  input,
  moreMenu,
  scrollRef,
}: {
  children: ReactNode
  input: Omit<ComponentProps<typeof ConversationInput>, 'className'>
  moreMenu: ReactNode
  scrollRef?: Ref<HTMLDivElement>
}) {
  return (
    <div className="relative flex h-full flex-col rounded-md border border-zinc-200/80 bg-zinc-50 [--conversation-width:44rem]">
      <div className="absolute right-3.75 top-3.75 z-10 flex items-center gap-2.75">
        <Button
          variant="outline"
          aria-label="Share conversation"
          className="size-[34px] rounded-full bg-transparent p-0 hover:bg-muted"
        >
          <Share2 className="size-4" />
        </Button>
        {moreMenu}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col pt-16">
        <div ref={scrollRef} className="scrollbar-fade min-h-0 flex-1 overflow-y-auto px-6">
          <div className="mx-auto flex min-h-full w-full max-w-(--conversation-width) flex-col pb-40">
            {children}
          </div>
        </div>

        {/* Reserve the same gutters as the message scroller on classic scrollbars. */}
        <div className="scrollbar-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden px-6">
          <div className="pointer-events-auto relative z-10">
            <ConversationInput {...input} className="mx-auto w-full max-w-(--conversation-width)" />
          </div>
          {/* The mask fills the transparent corners at the bottom of the input. */}
          <div aria-hidden className="relative z-0 -mt-6">
            <div className="mx-auto h-12 w-full max-w-(--conversation-width) bg-zinc-50" />
          </div>
        </div>
      </div>
    </div>
  )
}
