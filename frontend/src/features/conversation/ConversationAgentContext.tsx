import { useState } from 'react'
import { ChevronRight, Brain } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { AgentContextDigest } from '@/features/agent/types'

/**
 * 「Agent Context / Action」—— 挂在每条助手回答下面的开发期折叠区。
 *
 * 它回答的是唯一一个值得在开发阶段反复确认的问题：**这一轮它到底看到了什么。**
 * 数据来自这条消息自己记录的 digest（`ai_messages.agent_context_json`），不是
 * 现在重新算的 —— 空间会变，重算会把今天的空间说成那一轮的，那是假证据。
 *
 * 默认收起：它是证据，不是内容。展开只有几行事实，没有思维链 —— 这一版不假装
 * 能解释模型为什么这样回答，只说它拿到了什么、做了什么动作。
 */
export function ConversationAgentContext({
  context,
}: {
  context: AgentContextDigest
}) {
  const [isOpen, setIsOpen] = useState(false)
  const excerpted = context.sources.filter((source) => source.excerpted)

  return (
    <div
      data-slot="agent-context"
      className="w-full rounded-xl border border-dashed border-zinc-300/80 px-3 py-2 text-[11px] leading-5 dark:border-zinc-700"
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-1.5 text-left text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight
          className={cn('size-3 shrink-0 transition-transform', isOpen && 'rotate-90')}
        />
        <Brain className="size-3 shrink-0" />
        <span>Agent Context</span>
        <span className="ml-auto shrink-0 rounded bg-zinc-100 px-1.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          Action: {context.action}
        </span>
      </button>

      {isOpen && (
        <div className="mt-2 space-y-1.5 border-t border-dashed border-zinc-200 pt-2 dark:border-zinc-800">
          <p className="text-muted-foreground">
            Space: <span className="text-foreground">{context.space.name}</span>
          </p>

          <div>
            <p className="text-muted-foreground">Context used:</p>
            <ul className="mt-0.5 space-y-0.5 pl-3">
              {context.sources.map((source) => (
                <li key={source.id} className="truncate">
                  <span className="text-foreground">{source.title}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    · {source.kind} · {source.chars} 字
                    {source.excerpted ? ' · 正文已进 prompt' : ' · 仅标题'}
                  </span>
                </li>
              ))}
              {context.conversations.map((conversation) => (
                <li key={conversation.id} className="truncate text-muted-foreground">
                  对话「{conversation.title}」（仅标题）
                </li>
              ))}
              {context.historyMessages > 0 && (
                <li className="text-muted-foreground">
                  本对话历史 {context.historyMessages} 条
                </li>
              )}
              {context.sources.length === 0 && context.historyMessages === 0 && (
                <li className="text-muted-foreground">（没有可用上下文）</li>
              )}
            </ul>
          </div>

          <p className="text-muted-foreground">
            prompt {context.promptChars} 字
            {excerpted.length > 0 && `（其中摘录 ${context.excerptChars} 字）`} · Action:{' '}
            <span className="text-foreground">{context.action}</span>
          </p>
        </div>
      )}
    </div>
  )
}
