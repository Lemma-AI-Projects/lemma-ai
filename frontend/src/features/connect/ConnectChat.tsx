import { useState } from 'react'
import { SendHorizontal } from 'lucide-react'

import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ConnectPanelState } from './ConnectPanelState'
import { formatRelativeTime } from './connectTime'
import type { ConnectMessage, ConnectViewState } from './types'

// 聊天。设计稿：「聊天」+「AI 助手（包含用户画像），与 global agent 与 free course
// 的 agent 都不同」。本轮只做只读 mock —— 输入框能打字，但不真发，下面写清楚。

interface ConnectChatProps {
  messages: ConnectMessage[]
  assistantName: string
  state: ConnectViewState
}

export function ConnectChat({ messages, assistantName, state }: ConnectChatProps) {
  const [draft, setDraft] = useState('')

  if (state !== 'default') {
    return (
      <ConnectPanelState
        state={state}
        emptyTitle="还没有人说话"
        emptyHint="聊天是这一页三块内容里的一块；这里会长这个页的对话和助手的回复。"
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('flex items-start gap-2.5', message.fromMe && 'flex-row-reverse')}
          >
            <UserAvatar
              name={message.author.name}
              color={message.author.color}
              size={28}
              className="pointer-events-none shrink-0"
            />
            <div className={cn('flex min-w-0 max-w-[75%] flex-col', message.fromMe && 'items-end')}>
              <p className="mb-1 flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="font-medium text-zinc-600">{message.author.name}</span>
                {message.author.role === 'assistant' && (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">{assistantName}</span>
                )}
                <span>{formatRelativeTime(message.createdAt)}</span>
              </p>
              <p
                className={cn(
                  'rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  message.fromMe ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
                )}
              >
                {message.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-100 pt-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="说点什么…"
            rows={2}
            className="min-h-[44px] resize-none"
          />
          <Button size="icon" disabled title="原型阶段未接发送链路">
            <SendHorizontal className="size-4" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          原型：能打字、点不动发送 —— 发送链路与「本页专属助手」都还没接，别把它当已实现。
        </p>
      </div>
    </div>
  )
}
