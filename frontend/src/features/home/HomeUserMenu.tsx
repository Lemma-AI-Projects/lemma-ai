import { useState } from 'react'
import {
  Check,
  ChevronRight,
  CircleHelp,
  LogOut,
  Palette,
  Plus,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react'
import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
  ActionMenuSub,
} from '@/components/ActionMenu'
import { UserAvatar } from '@/components/UserAvatar'
import {
  HomeSettingsDialog,
  type HomeSettingsTab,
} from '@/features/home/HomeSettingsDialog'
import { currentUserAccount, userAccounts } from '@/mock/userAccounts'

export function HomeUserMenu() {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<HomeSettingsTab>('general')
  const [selectedAccountId, setSelectedAccountId] = useState(currentUserAccount.id)
  const selectedAccount =
    userAccounts.find((account) => account.id === selectedAccountId) ??
    currentUserAccount

  const handleAction = (label: string) => {
    console.log(label)
  }

  const openSettings = (tab: HomeSettingsTab) => {
    setSettingsTab(tab)
    setSettingsDialogOpen(true)
  }

  return (
    <>
      <ActionMenu
        align="end"
        side="bottom"
        sideOffset={8}
        width="lg"
        trigger={
          <UserAvatar
            name={selectedAccount.nickname}
            color={selectedAccount.color}
            showBadge
            aria-label="Open account menu"
            className="ms-0.5 rounded-full outline-none transition-colors hover:ring-2 hover:ring-zinc-200 data-[state=open]:ring-2 data-[state=open]:ring-zinc-200"
          />
        }
      >
        <ActionMenuSub
          sideOffset={8}
          width="lg"
          contentClassName="w-[272px] p-1"
          triggerClassName="mb-1 gap-2 rounded-lg px-2 py-2"
          trigger={
            <>
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: selectedAccount.color }}
              >
                <span className="text-[16px] font-bold leading-none text-white/90">
                  {selectedAccount.avatarLabel}
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium leading-[18px]">
                  {selectedAccount.nickname}
                </span>
                <span className="block truncate text-[13px] leading-[16px] text-muted-foreground">
                  {selectedAccount.subscriptionPlan}
                </span>
              </span>

              <ChevronRight className="size-[18px] shrink-0 text-muted-foreground" />
            </>
          }
        >
          {userAccounts.map((account) => (
            <ActionMenuItem
              key={account.id}
              className="gap-2.5 rounded-md px-2 py-1.5"
              onSelect={() => setSelectedAccountId(account.id)}
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: account.color }}
              >
                <span className="text-[12.5px] font-bold leading-none text-white/90">
                  {account.avatarLabel}
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium leading-[18px]">
                  {account.nickname}
                </span>
                <span className="block truncate text-[12.5px] leading-4 text-muted-foreground">
                  {account.email}
                </span>
              </span>

              {account.id === selectedAccount.id && (
                <Check className="size-[17px] shrink-0 text-foreground" />
              )}
            </ActionMenuItem>
          ))}

          <ActionMenuSeparator />

          <ActionMenuItem
            className="gap-2.5 rounded-sm px-[9px] py-[9px] text-[13.5px]"
            onSelect={() => handleAction('Add another account')}
          >
            <Plus className="size-[17px] shrink-0 text-foreground" />
            <span>添加另一个账户</span>
          </ActionMenuItem>
        </ActionMenuSub>

        <ActionMenuSeparator />

        <ActionMenuItem
          label="升级套餐"
          icon={Sparkles}
          onSelect={() => handleAction('Upgrade plan')}
        />
        <ActionMenuItem
          label="个性化"
          icon={Palette}
          onSelect={() => openSettings('personalization')}
        />
        <ActionMenuItem
          label="个人资料"
          icon={UserRound}
          onSelect={() => openSettings('account')}
        />
        <ActionMenuItem
          label="设置"
          icon={Settings}
          onSelect={() => openSettings('general')}
        />

        <ActionMenuSeparator />

        <ActionMenuItem
          label="帮助"
          icon={CircleHelp}
          onSelect={() => handleAction('Help')}
        />
        <ActionMenuItem
          label="退出登录"
          icon={LogOut}
          onSelect={() => handleAction('Log out')}
        />
      </ActionMenu>
      <HomeSettingsDialog
        account={selectedAccount}
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        defaultTab={settingsTab}
      />
    </>
  )
}
