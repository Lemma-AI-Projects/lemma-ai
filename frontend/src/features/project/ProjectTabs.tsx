import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/**
 * Learn space 组件栏（learn space = 组件集合 + agent 的"组件"层）
 * - Board / 对话 / 课程 / 来源 四个组件 tab，后续组件（图谱/复习/物料…）按注册表追加
 * - 默认进 Board（知识长的地方）
 */
const componentValues = ['Board', 'Chats', 'Courses', 'Sources'] as const
export type ProjectTab = (typeof componentValues)[number]

const tabKeyMap: Record<ProjectTab, string> = {
  Board: 'learnSpace.components.board',
  Chats: 'learnSpace.components.chat',
  Courses: 'learnSpace.components.courses',
  Sources: 'learnSpace.components.sources',
}

export function ProjectTabs({
  value,
  onChange,
}: {
  value: ProjectTab
  onChange: (tab: ProjectTab) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1">
      {componentValues.map((tab) => (
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
          {t(tabKeyMap[tab])}
        </button>
      ))}
    </div>
  )
}
