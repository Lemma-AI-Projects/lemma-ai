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

const subjectTabs: Array<{ value: PluginSubjectTab; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'general', label: '通用' },
  { value: 'math', label: '数学' },
  { value: 'physics', label: '物理' },
  { value: 'chemistry', label: '化学' },
  { value: 'biology', label: '生物' },
  { value: 'programming', label: '编程' },
  { value: 'languages', label: '语言' },
  { value: 'history', label: '历史' },
  { value: 'philosophy', label: '哲学' },
  { value: 'astronomy', label: '天文' },
  { value: 'music', label: '音乐' },
  { value: 'art', label: '艺术' },
  { value: 'economics', label: '经济' },
  { value: 'law', label: '法律' },
  { value: 'medicine', label: '医学' },
  { value: 'psychology', label: '心理学' },
  { value: 'archaeology', label: '考古' },
  { value: 'linguistics', label: '语言学' },
  { value: 'logic', label: '逻辑学' },
  { value: 'classics', label: '古典学' },
  { value: 'statistics', label: '统计学' },
  { value: 'cryptography', label: '密码学' },
  { value: 'paleontology', label: '古生物学' },
  { value: 'mythology', label: '神话学' },
  { value: 'chess', label: '棋类' },
]

export function PluginSubjectTabs({
  value,
  onChange,
}: {
  value: PluginSubjectTab
  onChange: (tab: PluginSubjectTab) => void
}) {
  return (
    <div
      className="mt-7 flex min-h-9 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="按学科筛选插件"
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
          {tab.label}
        </Button>
      ))}
    </div>
  )
}
