import {
  Brain,
  CircleUserRound,
  CreditCard,
  FileText,
  HardDrive,
  Palette,
  Settings2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Dialog as DialogPrimitive, Tabs as TabsPrimitive } from 'radix-ui'
import { useTranslation } from 'react-i18next'

import type { CurrentUser } from '@/features/auth/useCurrentUser'
import { cn } from '@/lib/utils'
import { HomeSettingsAccountPage } from './HomeSettingsAccountPage'
import { HomeSettingsBillingPage } from './HomeSettingsBillingPage'
import { HomeSettingsDocsPage } from './HomeSettingsDocsPage'
import { HomeSettingsGeneralPage } from './HomeSettingsGeneralPage'
import { HomeSettingsMemoryPage } from './HomeSettingsMemoryPage'
import { HomeSettingsStoragePage } from './HomeSettingsStoragePage'

export type HomeSettingsTab =
  | 'general'
  | 'account'
  | 'billing'
  | 'storage'
  | 'memory'
  | 'personalization'
  | 'docs'

interface HomeSettingsTabItem {
  value: HomeSettingsTab
  label: string
  icon: LucideIcon
}

const homeSettingsTabs: (
  t: (key: string) => string
) => HomeSettingsTabItem[] = (t) => [
  { value: 'general', label: t('settings.general'), icon: Settings2 },
  { value: 'account', label: t('settings.account'), icon: CircleUserRound },
  { value: 'billing', label: t('settings.billing'), icon: CreditCard },
  { value: 'storage', label: t('settings.storage'), icon: HardDrive },
  { value: 'memory', label: t('settings.memory'), icon: Brain },
  { value: 'personalization', label: t('settings.personalization'), icon: Palette },
  { value: 'docs', label: t('settings.docs'), icon: FileText },
]

interface HomeSettingsDialogProps {
  account: CurrentUser | undefined
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
  'flex items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm text-zinc-700 outline-none transition-colors hover:bg-zinc-100/70 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-300 data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 max-md:shrink-0'

const settingsPanelClassName =
  'min-h-0 grow overflow-y-auto px-5 py-4 text-sm text-zinc-900 max-md:px-4'

export function HomeSettingsDialog({
  account,
  open,
  onOpenChange,
  defaultTab = 'general',
}: HomeSettingsDialogProps) {
  const { t } = useTranslation()
  const tabs = homeSettingsTabs(t)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={settingsDialogOverlayClassName} />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={settingsDialogContentClassName}
        >
          <DialogPrimitive.Title className="sr-only">
            {t('settings.title')}
          </DialogPrimitive.Title>

          <TabsPrimitive.Root
            key={`${open}-${defaultTab}`}
            orientation="vertical"
            defaultValue={defaultTab}
            className="flex h-full min-h-0 flex-col md:flex-row"
          >
            <div className={settingsNavClassName}>
              <DialogPrimitive.Close
                aria-label={t('settings.close')}
                className={settingsNavCloseButtonClassName}
              >
                <X className="size-5" />
              </DialogPrimitive.Close>

              <TabsPrimitive.List
                aria-label={t('settings.title')}
                className="flex gap-1 max-md:items-center md:mt-1 md:flex-col md:gap-0.5"
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon

                  return (
                    <TabsPrimitive.Trigger
                      key={tab.value}
                      value={tab.value}
                      className={settingsTabBaseClassName}
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

            {tabs.map((tab) => (
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
                {tab.value === 'memory' && <HomeSettingsMemoryPage />}
                {tab.value === 'docs' && <HomeSettingsDocsPage />}
                {tab.value !== 'account' &&
                  tab.value !== 'billing' &&
                  tab.value !== 'general' &&
                  tab.value !== 'storage' &&
                  tab.value !== 'memory' &&
                  tab.value !== 'docs' && (
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
