import { cn } from '@/lib/utils'

const projectTabValues = ['Chats', 'Courses', 'Sources'] as const
export type ProjectTab = (typeof projectTabValues)[number]

export function ProjectTabs({
  value,
  onChange,
}: {
  value: ProjectTab
  onChange: (tab: ProjectTab) => void
})

{
  return (
    <div className="flex items-center gap-2">
      {projectTabValues.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm transition-colors',
            value === tab
              ? 'bg-zinc-200 text-foreground'
              : 'bg-transparent text-muted-foreground hover:bg-muted/50'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
