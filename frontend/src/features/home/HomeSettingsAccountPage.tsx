import type { ReactNode } from 'react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { currentUserAccount } from '@/mock/userAccounts'

interface AccountRowProps {
  label: string
  children: ReactNode
}

function AccountRow({ label, children }: AccountRowProps) {
  return (
    <div>
      <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 py-3">
        <span className="text-[16px] font-normal leading-7 text-zinc-600">
          {label}
        </span>
        {children}
      </div>
      <Separator className="bg-zinc-200" />
    </div>
  )
}

export function HomeSettingsAccountPage() {
  return (
    <>
      <h2 className="text-lg font-normal text-zinc-900">账户</h2>
      <Separator className="mt-4 bg-zinc-200" />

      <AccountRow label="头像">
        <Avatar
          className="size-8"
          style={{ backgroundColor: currentUserAccount.color }}
        >
          <AvatarFallback className="bg-transparent text-[13px] font-semibold leading-none text-white/90">
            {currentUserAccount.avatarLabel}
          </AvatarFallback>
        </Avatar>
      </AccountRow>
      <AccountRow label="昵称">
        <span className="max-w-[320px] truncate text-[16px] font-normal leading-7 text-zinc-500">
          {currentUserAccount.name}
        </span>
      </AccountRow>
      <AccountRow label="邮箱">
        <span className="max-w-[320px] truncate text-[16px] font-normal leading-7 text-zinc-500">
          {currentUserAccount.email}
        </span>
      </AccountRow>
    </>
  )
}
