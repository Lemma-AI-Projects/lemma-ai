import { CalendarCheck2, CalendarClock, WifiOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ActionChip } from '@/components/ActionChip'
import { CircularProgress } from '@/components/CircularProgress'
import { Button } from '@/components/ui/button'
import { ChatInput } from '@/features/home/ChatInput'
import { HomeUserMenu } from '@/features/home/HomeUserMenu'
import { useMemoryOverviewQuery } from '@/features/learner/learnerApi'
import { suggestions as baseSuggestions } from '@/mock/homeSuggestions'
import {
  usePlugins,
} from '@/features/plugins/pluginsApi'
import { installedPluginSuggestions } from '@/features/plugins/pluginSuggestions'

export function HomePage() {
  const navigate = useNavigate()

  // 首页发送 → 进入新会话态的 chat 页并自动发出这条消息，
  // 对话创建（采纳预生成 id）由 chat 页的流式链路完成。Course Planning 开关
  // 经 location.state 带入，由 chat 页在首条消息上走工具回合。
  const handleSend = (text: string, options?: { tool?: 'course_planning' }) => {
    navigate('/chat', {
      state: {
        initialMessage: text,
        messageKey: crypto.randomUUID(),
        tool: options?.tool,
      },
    })
  }

  // P5-A：首页建议 = 通用 4 条 + 已安装学科插件的增补建议（真实安装态驱动；
  // 后端不可达时 usePlugins isError → 仅通用 4 条，fail-open 不崩）。
  const { data: installedPlugins } = usePlugins()
  const pluginSuggestions = installedPluginSuggestions(
    installedPlugins?.filter((p) => p.installed).map((p) => p.subject) ?? []
  )
  const suggestions = [...baseSuggestions, ...pluginSuggestions]

  // L1 主线闭环：今日任务进度环接真实 learner 数据（D3 语义——复习队列健康度）。
  // 后端 memory_overview 只给「当前待复习数 todayDueCount」，没有「今日已完成/总
  // 数」，故进度取诚实二元制：引擎不可用=0、待复习清空=100、仍有待复习=0——绝不
  // 在 40 之外编造中间百分比（见计划 §2.3 防过拟合决策）。
  const { data: overview, isError } = useMemoryOverviewQuery()
  const enabled = overview?.enabled === true && !isError
  const dueCount = enabled ? overview.todayDueCount : 0
  const isAllTasksDone = enabled && dueCount === 0
  const todayTaskProgress = isAllTasksDone ? 100 : 0
  const TaskIcon = !enabled ? WifiOff : isAllTasksDone ? CalendarCheck2 : CalendarClock
  const taskStatusLabel = !enabled
    ? '今日任务（记忆引擎未启用）'
    : isAllTasksDone
      ? '今日复习已清空'
      : `今日待复习（${dueCount} 项）`

  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <Button
          variant="ghost"
          aria-label={taskStatusLabel}
          title={taskStatusLabel}
          disabled={!enabled}
          className="relative size-8 rounded-full p-0 disabled:cursor-default disabled:opacity-60"
        >
          {/* 32x32 ring with 1.5px stroke replaces the old `border
              border-zinc-200` outline; outer edge of the stroke still
              lands on the button box edge so it's pixel-aligned. */}
          <CircularProgress
            value={todayTaskProgress}
            size={32}
            strokeWidth={1.5}
            trackColor="transparent"
            /* `size-8` is required: Button has a cascade rule
               `[&_svg:not([class*='size-'])]:size-4` that would otherwise
               shrink the SVG element to 16x16 while leaving viewBox at
               32x32, visibly distorting and mispositioning the ring. */
            className="pointer-events-none absolute inset-0 size-8"
          />
          <TaskIcon className="size-[18px]" />
        </Button>
        <HomeUserMenu />
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
          <ChatInput onSend={handleSend} />
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <ActionChip
                key={s.label}
                icon={s.icon}
                iconColor={s.iconColor}
                label={s.label}
                onClick={() => handleSend(s.label)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
