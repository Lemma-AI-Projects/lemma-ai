import { ChatInput } from '@/features/home/ChatInput'

export function HomePage() {
  return (
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
      </div>
    </div>
  )
}
