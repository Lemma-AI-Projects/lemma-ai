import { Languages } from 'lucide-react'
import { ActionChip } from '@/components/ActionChip'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { ChatInput } from '@/features/home/ChatInput'
import { suggestions } from '@/mock/homeSuggestions'

export function HomePage() {
  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <Button
          variant="ghost"
          aria-label="Switch language"
          className="size-8 rounded-full p-0"
        >
          <Languages className="size-[18px]" />
        </Button>
        <UserAvatar name="Alex" showBadge onClick={() => console.log('avatar clicked')} />
      </div>
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              What do you want to learn?
            </h1>
            <p className="text-sm text-zinc-500">
              Describe a topic, paste a link, or ask a question to get started.
            </p>
          </div>
          <ChatInput />
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <ActionChip
                key={s.label}
                icon={s.icon}
                iconColor={s.iconColor}
                label={s.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
