import { useState } from 'react'
import {
  BookOpen,
  CreditCard,
  FolderKanban,
  GraduationCap,
  MessageSquare,
  Settings,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  Waypoints,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ConnectBlock, ConnectPartition, ConnectPartitionId } from './types'

// 右侧小菜单。原来横在内容区上方的四个选项（Feed / 成员 / 聊天 / 成就）搬到这里，
// 变成一列竖排的子选项；上面再加一组「分区」用来在 Classroom / Project 之间跳。
//
// 它只是画面 —— 切的是本页内部看哪一块，不接管 AppLayout 的真导航。

const PARTITION_ICON: Record<ConnectPartitionId, LucideIcon> = {
  classroom: GraduationCap,
  project: FolderKanban,
}

const BLOCKS: { id: ConnectBlock; label: string; icon: LucideIcon }[] = [
  { id: 'feed', label: 'Feed', icon: Waypoints },
  { id: 'members', label: '成员', icon: Users },
  { id: 'chat', label: '聊天', icon: MessageSquare },
  { id: 'achievements', label: '成就', icon: Trophy },
]

// 头像子菜单。设计稿：「用户资料编辑…记忆，设置，储存空间，积分和个性化」，
// 并「添加一个"成就"栏目」。本轮只有「成就」是通的，其余标注为未接。
const ME_ITEMS = [
  { id: 'profile', label: '用户资料编辑', icon: UserRound, wired: false },
  { id: 'memory', label: '记忆', icon: Sparkles, wired: false },
  { id: 'achievements', label: '成就', icon: Trophy, wired: true },
  { id: 'settings', label: '设置', icon: Settings, wired: false },
  { id: 'storage', label: '储存空间', icon: BookOpen, wired: false },
  { id: 'credits', label: '积分', icon: CreditCard, wired: false },
  { id: 'personalization', label: '个性化', icon: Sparkles, wired: false },
]

function RailItem({
  icon: Icon,
  label,
  active,
  onClick,
  title,
}: {
  icon: LucideIcon
  label: string
  active?: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-current={active}
      className={cn(
        'flex w-full flex-col items-center gap-1 rounded-lg py-2 text-[11px] transition-colors',
        active ? 'bg-amber-50 font-semibold text-amber-700' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
      )}
    >
      <Icon className={cn('size-4', active && 'stroke-[2.4]')} />
      {label}
    </button>
  )
}

interface ConnectRailProps {
  partitions: ConnectPartition[]
  focusedPartitionId: ConnectPartitionId
  onFocusPartition: (id: ConnectPartitionId) => void
  block: ConnectBlock
  onSelectBlock: (block: ConnectBlock) => void
}

export function ConnectRail({
  partitions,
  focusedPartitionId,
  onFocusPartition,
  block,
  onSelectBlock,
}: ConnectRailProps) {
  const [meOpen, setMeOpen] = useState(false)

  return (
    <nav className="relative flex w-[76px] shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="flex flex-col gap-0.5 p-2">
        <p className="px-1 pb-1 text-[10px] font-medium tracking-wide text-zinc-400">分区</p>
        {partitions.map((partition) => (
          <RailItem
            key={partition.id}
            icon={PARTITION_ICON[partition.id]}
            label={partition.name}
            active={partition.id === focusedPartitionId}
            onClick={() => onFocusPartition(partition.id)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-zinc-100 p-2">
        <p className="px-1 pb-1 text-[10px] font-medium tracking-wide text-zinc-400">内容</p>
        {BLOCKS.map((item) => (
          <RailItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={item.id === block}
            onClick={() => onSelectBlock(item.id)}
          />
        ))}
      </div>

      <div className="relative mt-auto border-t border-zinc-100 p-2">
        <RailItem icon={UserRound} label="我的" active={meOpen} onClick={() => setMeOpen((value) => !value)} />

        {meOpen && (
          <>
            <button
              type="button"
              aria-label="关闭我的菜单"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setMeOpen(false)}
            />
            <div className="absolute right-full bottom-2 z-50 mr-2 w-[220px] rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
              {ME_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.wired}
                    title={item.wired ? undefined : '原型阶段未接：设计稿里有，但这一轮只画'}
                    onClick={() => {
                      if (!item.wired) return
                      onSelectBlock('achievements')
                      setMeOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm',
                      item.wired ? 'text-zinc-700 hover:bg-zinc-100' : 'text-zinc-400'
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.wired ? (
                      <span className="text-[10px] text-amber-600">可看</span>
                    ) : (
                      <span className="rounded bg-zinc-100 px-1 py-0.5 text-[10px]">未接</span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </nav>
  )
}
