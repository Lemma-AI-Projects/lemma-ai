import { useEffect, useState } from 'react'
import {
  Brain,
  CircleUserRound,
  CreditCard,
  HardDrive,
  Palette,
  Settings2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Dialog as DialogPrimitive, Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'
import type { UserAccount } from '@/mock/userAccounts'
import { HomeSettingsAccountPage } from './HomeSettingsAccountPage'
import { HomeSettingsBillingPage } from './HomeSettingsBillingPage'
import { HomeSettingsGeneralPage } from './HomeSettingsGeneralPage'
import { HomeSettingsStoragePage } from './HomeSettingsStoragePage'

export type HomeSettingsTab =
  | 'general'
  | 'account'
  | 'billing'
  | 'storage'
  | 'memory'
  | 'personalization'

interface HomeSettingsTabItem {
  value: HomeSettingsTab
  label: string
  icon: LucideIcon
}

const homeSettingsTabs: HomeSettingsTabItem[] = [
  { value: 'general', label: '通用', icon: Settings2 },
  { value: 'account', label: '账户', icon: CircleUserRound },
  { value: 'billing', label: '订阅和使用量', icon: CreditCard },
  { value: 'storage', label: '存储空间', icon: HardDrive },
  { value: 'memory', label: '记忆', icon: Brain },
  { value: 'personalization', label: '个性化', icon: Palette },
]

interface HomeSettingsDialogProps {
  account: UserAccount
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: HomeSettingsTab
}

const settingsDialogOverlayClassName =
  'fixed inset-0 z-50 bg-gray-200/50 backdrop-blur-[0.5px] transition-opacity data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0'

const settingsDialogContentClassName = cn(
  'fixed left-1/2 top-1/2 z-50 flex h-full w-[calc(100vw-20px)] max-w-[680px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-zinc-250 bg-white outline-none',
  'max-h-[70vh] max-md:min-h-[60vh] md:h-[600px]',
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
)

// 左侧导航：桌面竖向固定宽度，窄屏转为可横向滚动的标签条。
const settingsNavClassName =
  'flex shrink-0 select-none gap-1 p-1.5 max-md:items-center max-md:overflow-x-auto max-md:border-b max-md:border-zinc-200 md:w-[172px] md:min-w-[156px] md:flex-col md:gap-0.5'

// 关闭按钮：圆形，上、左间隔相同（nav 内边距 6px + 自身外边距 6px = 12px），
// 圆心垂直居中对齐右侧标题（12 + size-9 的一半 18 = 30px，与标题 py-4 + 行高一半一致）。
const settingsNavCloseButtonClassName =
  'mt-1.5 ms-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-zinc-600 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-300'

const settingsTabBaseClassName =
  'flex items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300 max-md:shrink-0'
const settingsTabActiveClassName = 'bg-zinc-100 text-zinc-900'
const settingsTabIdleClassName =
  'text-zinc-700 hover:bg-zinc-100/70 hover:text-zinc-900'

const settingsPanelClassName =
  'min-h-0 grow overflow-y-auto px-5 py-4 text-sm text-zinc-900 max-md:px-4'

export function HomeSettingsDialog({
  account,
  open,
  onOpenChange,
  defaultTab = 'general',
}: HomeSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<HomeSettingsTab>(defaultTab)

  // 每次打开都回到入口对应的分类（设置/个性化/个人资料）。
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab)
    }
  }, [open, defaultTab])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={settingsDialogOverlayClassName} />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={settingsDialogContentClassName}
        >
          <DialogPrimitive.Title className="sr-only">设置</DialogPrimitive.Title>

          <TabsPrimitive.Root
            orientation="vertical"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as HomeSettingsTab)}
            className="flex h-full min-h-0 flex-col md:flex-row"
          >
            <div className={settingsNavClassName}>
              <DialogPrimitive.Close
                aria-label="关闭设置"
                className={settingsNavCloseButtonClassName}
              >
                <X className="size-5" />
              </DialogPrimitive.Close>

              <TabsPrimitive.List
                aria-label="设置分类"
                className="flex gap-1 max-md:items-center md:mt-1 md:flex-col md:gap-0.5"
              >
                {homeSettingsTabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.value

                  return (
                    <TabsPrimitive.Trigger
                      key={tab.value}
                      value={tab.value}
                      className={cn(
                        settingsTabBaseClassName,
                        isActive
                          ? settingsTabActiveClassName
                          : settingsTabIdleClassName
                      )}
                    >
                      <Icon
                        className="size-[18px] shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 grow truncate">{tab.label}</span>
                    </TabsPrimitive.Trigger>
                  )
                })}
              </TabsPrimitive.List>
            </div>

            {homeSettingsTabs.map((tab) => (
              <TabsPrimitive.Content
                key={tab.value}
                value={tab.value}
                className={settingsPanelClassName}
              >
                {tab.value === 'account' && (
                  <HomeSettingsAccountPage account={account} />
                )}
                {tab.value === 'billing' && (
                  <HomeSettingsBillingPage account={account} />
                )}
                {tab.value === 'general' && <HomeSettingsGeneralPage />}
                {tab.value === 'storage' && <HomeSettingsStoragePage />}
                {tab.value !== 'account' &&
                  tab.value !== 'billing' &&
                  tab.value !== 'general' &&
                  tab.value !== 'storage' && (
                    <h2 className="text-lg font-normal text-zinc-900">
                      {tab.label}
                    </h2>
                  )}
              </TabsPrimitive.Content>
            ))}
          </TabsPrimitive.Root>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
