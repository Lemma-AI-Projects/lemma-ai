import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type PluginSubjectTab = 'all' | 'general' | 'math'

const subjectTabs: Array<{ value: PluginSubjectTab; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'general', label: '通用' },
  { value: 'math', label: '数学' },
]

export function PluginSubjectTabs({
  value,
  onChange,
}: {
  value: PluginSubjectTab
  onChange: (tab: PluginSubjectTab) => void
}) {
  return (
    <div className="mt-7 flex min-h-9 items-center gap-2">
      {subjectTabs.map((tab) => (
        <Button
          key={tab.value}
          type="button"
          variant="ghost"
          className={cn(
            'rounded-full bg-transparent px-4 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground',
            value === tab.value &&
              'bg-muted text-foreground hover:bg-muted hover:text-foreground'
          )}
          onClick={() => onChange(tab.value)}
          aria-current={value === tab.value ? 'page' : undefined}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  )
}
