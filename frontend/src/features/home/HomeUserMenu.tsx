import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import {
  currentUserQueryKey,
  useCurrentUser,
} from '@/features/auth/useCurrentUser'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { currentUserAccountId, userAccounts } from '@/mock/userAccounts'

export function HomeUserMenu() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: currentUser } = useCurrentUser()
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<HomeSettingsTab>('general')
  const fallbackEmail = session?.user.email ?? ''
  const fallbackNickname = fallbackEmail.split('@')[0] || '用户'
  const displayNickname = currentUser?.nickname ?? fallbackNickname
  const displayEmail = currentUser?.email ?? fallbackEmail
  const displayColor = currentUser?.avatarColor ?? '#71717a'
  const displayAvatarLabel =
    currentUser?.avatarLabel ??
    Array.from(fallbackNickname)[0]?.toUpperCase() ??
    'U'
  const secondaryAccounts = userAccounts.filter(
    (account) => account.id !== currentUserAccountId
  )

  const handleAction = (label: string) => {
    console.log(label)
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Failed to sign out', error)
      return
    }

    queryClient.removeQueries({ queryKey: currentUserQueryKey })
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
            name={displayNickname}
            color={displayColor}
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
                style={{ backgroundColor: displayColor }}
              >
                <span className="text-[16px] font-bold leading-none text-white/90">
                  {displayAvatarLabel}
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium leading-[18px]">
                  {displayNickname}
                </span>
                <span className="block truncate text-[13px] leading-[16px] text-muted-foreground">
                  {currentUser?.subscriptionPlan ?? '加载中'}
                </span>
              </span>

              <ChevronRight className="size-[18px] shrink-0 text-muted-foreground" />
            </>
          }
        >
          <ActionMenuItem className="gap-2.5 rounded-md px-2 py-1.5">
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: displayColor }}
            >
              <span className="text-[12.5px] font-bold leading-none text-white/90">
                {displayAvatarLabel}
              </span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium leading-[18px]">
                {displayNickname}
              </span>
              <span className="block truncate text-[12.5px] leading-4 text-muted-foreground">
                {displayEmail}
              </span>
            </span>

            <Check className="size-[17px] shrink-0 text-foreground" />
          </ActionMenuItem>

          {secondaryAccounts.map((account) => (
            <ActionMenuItem
              key={account.id}
              className="gap-2.5 rounded-md px-2 py-1.5"
              onSelect={() => handleAction(`Switch account: ${account.id}`)}
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
          onSelect={() => void handleSignOut()}
        />
      </ActionMenu>
      <HomeSettingsDialog
        account={currentUser}
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        defaultTab={settingsTab}
      />
    </>
  )
}
