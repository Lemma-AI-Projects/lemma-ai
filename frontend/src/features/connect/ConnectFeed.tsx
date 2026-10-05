import {
  FileText,
  HelpCircle,
  Megaphone,
  MessageSquare,
  PenLine,
  Pin,
  Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { UserAvatar } from '@/components/UserAvatar'
import { cn } from '@/lib/utils'
import { ConnectPanelState } from './ConnectPanelState'
import { formatRelativeTime } from './connectTime'
import type { ConnectFeedItem, ConnectFeedKind, ConnectViewState } from './types'

// Feed：设计稿要求「列表里包含不同的类型」—— 所以每种类型有自己的图标与配色，
// 不是一排长得一样的白块。类型是这一页能不能被读懂的关键。

const KIND_META: Record<ConnectFeedKind, { label: string; icon: LucideIcon; chip: string; bar: string }> = {
  note: { label: '笔记', icon: PenLine, chip: 'bg-amber-50 text-amber-700', bar: 'bg-amber-300' },
  question: { label: '提问', icon: HelpCircle, chip: 'bg-blue-50 text-blue-700', bar: 'bg-blue-300' },
  resource: { label: '资料', icon: FileText, chip: 'bg-violet-50 text-violet-700', bar: 'bg-violet-300' },
  achievement: { label: '成就', icon: Trophy, chip: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-300' },
  announcement: { label: '公告', icon: Megaphone, chip: 'bg-rose-50 text-rose-700', bar: 'bg-rose-300' },
}

function FeedCard({ item }: { item: ConnectFeedItem }) {
  const meta = KIND_META[item.kind]
  const Icon = meta.icon

  return (
    <article className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4">
      <span className={cn('absolute inset-y-0 left-0 w-1', meta.bar)} />
      <header className="flex items-center gap-2.5">
        <UserAvatar name={item.author.name} color={item.author.color} size={28} className="pointer-events-none" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">{item.author.name}</p>
          <p className="truncate text-xs text-zinc-500">{formatRelativeTime(item.createdAt)}</p>
        </div>
        {item.pinned && (
          <span className="flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
            <Pin className="size-3" />
            置顶
          </span>
        )}
        <span className={cn('flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium', meta.chip)}>
          <Icon className="size-3" />
          {meta.label}
        </span>
      </header>

      {item.title && <h3 className="mt-3 text-sm font-semibold text-zinc-900">{item.title}</h3>}
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{item.body}</p>

      {item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <footer className="mt-3 flex items-center gap-3 border-t border-zinc-100 pt-2.5">
        {item.reactions.map((reaction) => (
          <span
            key={reaction.emoji}
            className="flex items-center gap-1 rounded-full bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600"
          >
            <span>{reaction.emoji}</span>
            {reaction.count}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1 text-xs text-zinc-400">
          <MessageSquare className="size-3.5" />
          {item.commentCount}
        </span>
      </footer>
    </article>
  )
}

interface ConnectFeedProps {
  items: ConnectFeedItem[]
  state: ConnectViewState
}

export function ConnectFeed({ items, state }: ConnectFeedProps) {
  if (state !== 'default') {
    return (
      <ConnectPanelState
        state={state}
        emptyTitle="这个页还没有内容"
        emptyHint="Feed 里会长笔记 / 提问 / 资料 / 成就 / 公告五种卡片。空的时候就是这样，不编内容。"
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <FeedCard key={item.id} item={item} />
      ))}
    </div>
  )
}
