import { MessageSquare, PanelLeft } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * 活动顶栏 —— **只有三样东西**：现在在做什么、两个窗格开关、一个"这是原型"的角标。
 *
 * 刻意没有的：进度条、还剩几节、掌握度、计时器。那些东西一旦出现在顶栏，
 * 眼睛就会一直往那儿跑，而这一页要人看的是中间那道题。
 */
export function ActivityHeader({
  title,
  kind,
  sidebarOpen,
  chatOpen,
  onToggleSidebar,
  onToggleChat,
}: {
  title: string
  kind: string
  sidebarOpen: boolean
  chatOpen: boolean
  onToggleSidebar: () => void
  onToggleChat: () => void
}) {
  return (
    <header
      data-slot="activity-header"
      className="flex h-14 shrink-0 items-center gap-4 border-b border-zinc-200/70 px-5"
    >
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-medium leading-5 text-zinc-900">{title}</h1>
      </div>
      <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">
        {kind}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <span className="mr-2 hidden text-[11px] text-zinc-400 sm:inline">
          Proposal B · 原型
        </span>
        <PaneToggle
          label="材料"
          icon={PanelLeft}
          open={sidebarOpen}
          controls="activity-context-sidebar"
          onClick={onToggleSidebar}
        />
        <PaneToggle
          label="对话"
          icon={MessageSquare}
          open={chatOpen}
          controls="activity-chat-panel"
          onClick={onToggleChat}
        />
      </div>
    </header>
  )
}

/** 一个窗格开关。开着时按下去是实的，收起时是空的 —— 不靠颜色也能看出状态。 */
function PaneToggle({
  label,
  icon: Icon,
  open,
  controls,
  onClick,
}: {
  label: string
  icon: typeof PanelLeft
  open: boolean
  controls: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      title={open ? `收起${label}` : `展开${label}`}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] transition-colors',
        open ? 'bg-zinc-100 text-zinc-700' : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600'
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}
