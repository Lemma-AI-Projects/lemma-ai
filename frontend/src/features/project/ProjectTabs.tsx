import { useState } from 'react'
import { cn } from '@/lib/utils'

const tabs = ['Chats', 'Courses', 'Sources'] as const

export function ProjectTabs() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Chats')

  return (
    <div className="flex items-center gap-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab

        return (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm transition-colors',
              isActive
                ? 'bg-zinc-200 text-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted/50'
            )}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}
