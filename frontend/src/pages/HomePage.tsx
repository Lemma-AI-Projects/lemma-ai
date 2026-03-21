import { FileText, GraduationCap, Lightbulb, Search } from 'lucide-react'
import { ActionChip } from '@/components/ActionChip'
import { ChatInput } from '@/features/home/ChatInput'

const suggestions = [
  { icon: FileText, iconColor: '#EA8444', label: 'Summarize text' },
  { icon: GraduationCap, iconColor: '#4A90D9', label: 'Start a course' },
  { icon: Lightbulb, iconColor: '#4CAF50', label: 'Explain a concept' },
  { icon: Search, iconColor: '#9C5EC7', label: 'Search resources' },
] as const

export function HomePage() {
  return (
    <div className="h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
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
