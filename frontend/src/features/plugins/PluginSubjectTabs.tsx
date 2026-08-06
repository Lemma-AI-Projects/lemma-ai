import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type PluginSubjectTab =
  | 'all'
  | 'general'
  | 'math'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'programming'
  | 'languages'
  | 'history'
  | 'philosophy'
  | 'astronomy'
  | 'music'
  | 'art'
  | 'economics'
  | 'law'
  | 'medicine'
  | 'psychology'
  | 'archaeology'
  | 'linguistics'
  | 'logic'
  | 'classics'
  | 'statistics'
  | 'cryptography'
  | 'paleontology'
  | 'mythology'
  | 'chess'

const subjectTabs: Array<{
  value: PluginSubjectTab
  labelKey: string
}> = [
  { value: 'all', labelKey: 'plugins.subjects.all' },
  { value: 'general', labelKey: 'plugins.subjects.general' },
  { value: 'math', labelKey: 'plugins.subjects.math' },
  { value: 'physics', labelKey: 'plugins.subjects.physics' },
  { value: 'chemistry', labelKey: 'plugins.subjects.chemistry' },
  { value: 'biology', labelKey: 'plugins.subjects.biology' },
  { value: 'programming', labelKey: 'plugins.subjects.programming' },
  { value: 'languages', labelKey: 'plugins.subjects.languages' },
  { value: 'history', labelKey: 'plugins.subjects.history' },
  { value: 'philosophy', labelKey: 'plugins.subjects.philosophy' },
  { value: 'astronomy', labelKey: 'plugins.subjects.astronomy' },
  { value: 'music', labelKey: 'plugins.subjects.music' },
  { value: 'art', labelKey: 'plugins.subjects.art' },
  { value: 'economics', labelKey: 'plugins.subjects.economics' },
  { value: 'law', labelKey: 'plugins.subjects.law' },
  { value: 'medicine', labelKey: 'plugins.subjects.medicine' },
  { value: 'psychology', labelKey: 'plugins.subjects.psychology' },
  { value: 'archaeology', labelKey: 'plugins.subjects.archaeology' },
  { value: 'linguistics', labelKey: 'plugins.subjects.linguistics' },
  { value: 'logic', labelKey: 'plugins.subjects.logic' },
  { value: 'classics', labelKey: 'plugins.subjects.classics' },
  { value: 'statistics', labelKey: 'plugins.subjects.statistics' },
  { value: 'cryptography', labelKey: 'plugins.subjects.cryptography' },
  { value: 'paleontology', labelKey: 'plugins.subjects.paleontology' },
  { value: 'mythology', labelKey: 'plugins.subjects.mythology' },
  { value: 'chess', labelKey: 'plugins.subjects.chess' },
]

export function PluginSubjectTabs({
  value,
  onChange,
}: {
  value: PluginSubjectTab
  onChange: (tab: PluginSubjectTab) => void
}) {
  const { t } = useTranslation()

  return (
    <div
      className="mt-7 flex min-h-9 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="plugins.subjectTabsAria"
    >
      {subjectTabs.map((tab) => (
        <Button
          key={tab.value}
          type="button"
          variant="ghost"
          role="tab"
          aria-selected={value === tab.value}
          className={cn(
            'shrink-0 rounded-full bg-transparent px-4 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground',
            value === tab.value &&
              'bg-muted text-foreground hover:bg-muted hover:text-foreground'
          )}
          onClick={() => onChange(tab.value)}
          aria-current={value === tab.value ? 'page' : undefined}
        >
          {t(tab.labelKey)}
        </Button>
      ))}
    </div>
  )
}
