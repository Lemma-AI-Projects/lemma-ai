import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { ActivityHeader } from '@/features/focus-activity/ActivityHeader'
import { ChatPanel, type ChatMessage } from '@/features/focus-activity/ChatPanel'
import { ContextSidebar } from '@/features/focus-activity/ContextSidebar'
import {
  ACTIVITY,
  CHAT_REPLIES,
  CHAT_SEED,
  EIGEN_KEYWORDS,
} from '@/features/focus-activity/activityData'

/**
 * Focus Mode · **Proposal B（Activity-Centric Workspace）** 的评审入口。
 *
 * `/preview/focus-activity`，免登录、不连后端、数据全是 mock。
 *
 * ## 为什么是独立一条路由，而不是改 FocusView
 *
 * 真的聚焦页（`features/learn-space/focus/FocusView.tsx`，1151 行）连着后端、有自动保存
 * 和证据链。为了试一个交互想法去改它，等于让这个想法**变贵**：改坏了要回滚半天，
 * 试完不想保留又要再拆一次。
 *
 * 所以这里是**并排的一条路**：形状做对了再谈要不要搬进真页面。
 * 回滚方式 = 删掉 `features/focus-activity/` 这个目录 + 路由那几行。
 *
 * ## 这一屏在验什么
 *
 * 「当前学习活动」能不能当主界面对象。所以中栏占据剩下全部宽度，左右两栏都压灰、
 * 都能收；顶栏只有"现在在做什么"和两个开关，没有进度、没有掌握度。
 *
 * ## Stage 1 的边界（现在能看到的东西）
 *
 * 只有**版面骨架 + 对话能发能回**。中栏那段正文是静态的，可交互的可视化与模拟
 * Agent 插入分别在 Stage 2 / Stage 3 —— 中栏里那个虚线框就是留给它们的，标着阶段号，
 * 免得评审以为"功能没做"。
 */
export function FocusActivityPreviewPage() {
  /* 初始开合可以从 URL 指：`?sidebar=0` / `?chat=0`。
     截图要拍第二种状态，而 headless 点不到按钮 —— 一条链接比一段脚本可靠。
     评审也能直接发"两栏都收"的链接给别人看。 */
  const [params] = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(params.get('sidebar') !== '0')
  const [chatOpen, setChatOpen] = useState(params.get('chat') !== '0')
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_SEED)
  const [pending, setPending] = useState(false)
  const timer = useRef<number | null>(null)

  /* 卸载时把计时器清掉：否则切走页面后回调还会往已经卸载的组件里 setState。 */
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    []
  )

  const send = (text: string) => {
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text }])
    setPending(true)
    timer.current = window.setTimeout(() => {
      timer.current = null
      setPending(false)
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'agent', text: pickReply(text) },
      ])
    }, 700)
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-zinc-900">
      <ActivityHeader
        title={ACTIVITY.title}
        kind={ACTIVITY.kind}
        sidebarOpen={sidebarOpen}
        chatOpen={chatOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onToggleChat={() => setChatOpen((v) => !v)}
      />

      <div className="flex min-h-0 flex-1">
        {/* 左：收起时宽度归零，内容保持挂载（滚动位置不丢）。
            `aria-hidden` 让键盘和读屏在收起时跳过它。 */}
        <div
          id="activity-sidebar-shell"
          className={cn(
            'shrink-0 overflow-hidden transition-[width] duration-200',
            sidebarOpen ? 'w-60' : 'w-0'
          )}
          aria-hidden={!sidebarOpen}
        >
          <ContextSidebar />
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <article className="mx-auto max-w-[46rem] px-8 py-10">
            <div className="space-y-4">
              {ACTIVITY.intro.map((line, i) => (
                <p
                  key={i}
                  className={cn(
                    'text-[15px] leading-8 text-zinc-700',
                    /* 第一句稍重：它是这一屏的"钩子"。 */
                    i === 0 && 'font-medium text-zinc-900'
                  )}
                >
                  {line}
                </p>
              ))}
            </div>

            <SlotPlaceholder stage="Stage 2" title="可交互的可视化 + 一道检查题" />

            <SlotPlaceholder stage="Stage 3" title="模拟 Agent 建议（可撤销）" />
          </article>
        </main>

        {/* 右：同上，收起时归零、保持挂载（草稿不丢）。 */}
        <div
          id="activity-chat-shell"
          className={cn(
            'shrink-0 overflow-hidden transition-[width] duration-200',
            chatOpen ? 'w-80' : 'w-0'
          )}
          aria-hidden={!chatOpen}
        >
          <ChatPanel messages={messages} pending={pending} onSend={send} />
        </div>
      </div>
    </div>
  )
}

/**
 * 还没做的那一块 —— **明写着阶段号**。
 *
 * 不画一个"看起来像成品"的假组件：那样评审会去评它的样式，而它根本不工作。
 * 虚线 + 阶段号是这一屏最诚实的东西。
 */
function SlotPlaceholder({ stage, title }: { stage: string; title: string }) {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-zinc-200 px-4 py-6">
      <p className="text-[11px] tracking-[0.08em] text-zinc-400">{stage}</p>
      <p className="mt-1 text-[13px] leading-6 text-zinc-500">{title}</p>
    </div>
  )
}

/** 命中关键词走特征向量那条，否则兜底。只有两条，故意。 */
function pickReply(text: string): string {
  return EIGEN_KEYWORDS.some((k) => text.includes(k))
    ? CHAT_REPLIES.eigen
    : CHAT_REPLIES.fallback
}
