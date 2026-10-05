import { Sparkles } from 'lucide-react'

import { UserAvatar } from '@/components/UserAvatar'
import { cn } from '@/lib/utils'
import { ConnectPanelState } from './ConnectPanelState'
import type { ConnectMember, ConnectViewState } from './types'

// 成员列表。设计稿：「查看成员列表」。角色分三档：我建的页里有 owner，
// 每个页都带一个 assistant（这一页的专属助手，见 types.ts 的说明）。

const ROLE_LABEL: Record<ConnectMember['role'], string | null> = {
  owner: '创建者',
  assistant: '本页助手',
  member: null,
}

interface ConnectMemberListProps {
  members: ConnectMember[]
  state: ConnectViewState
}

export function ConnectMemberList({ members, state }: ConnectMemberListProps) {
  if (state !== 'default') {
    return (
      <ConnectPanelState
        state={state}
        emptyTitle="还没有别人"
        emptyHint="成员列表会显示这个页里的所有人，以及每个人的角色和一句话简介。"
      />
    )
  }

  return (
    <ul className="flex flex-col gap-1">
      {members.map((member) => {
        const roleLabel = ROLE_LABEL[member.role]
        return (
          <li
            key={member.id}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-zinc-50"
          >
            <span className="relative shrink-0">
              <UserAvatar name={member.name} color={member.color} size={36} className="pointer-events-none" />
              <span
                className={cn(
                  'absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white',
                  member.online ? 'bg-emerald-400' : 'bg-zinc-300'
                )}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-zinc-900">{member.name}</span>
                {member.role === 'assistant' && <Sparkles className="size-3.5 shrink-0 text-amber-500" />}
                {roleLabel && (
                  <span
                    className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px]',
                      member.role === 'assistant' ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-500'
                    )}
                  >
                    {roleLabel}
                  </span>
                )}
              </span>
              <span className="block truncate text-xs text-zinc-500">{member.headline}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
