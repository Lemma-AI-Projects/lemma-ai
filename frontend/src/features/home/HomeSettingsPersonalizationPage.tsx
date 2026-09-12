import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useAppTranslation } from '@/i18n'
import { useFeatureDefaults } from '@/hooks/useFeatureDefaults'
import { useNotificationSettings } from '@/hooks/useNotificationSettings'
import { requestNotificationPermission } from '@/hooks/useNotificationSettings'

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 py-3">
      <div className="min-w-0">
        <span className="block text-[16px] font-normal leading-7 text-zinc-600">
          {label}
        </span>
        {description && (
          <span className="block text-xs leading-5 text-zinc-400">
            {description}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

export function HomeSettingsPersonalizationPage() {
  const { t } = useAppTranslation()
  const [featureDefaults, setFeatureDefaults] = useFeatureDefaults()
  const [notificationSettings, setNotificationSettings] =
    useNotificationSettings()

  const handleNotificationToggle = async (checked: boolean) => {
    if (checked) {
      const granted = await requestNotificationPermission()
      if (!granted) return
    }
    setNotificationSettings({ enabled: checked })
  }

  const handleDailyReminderToggle = async (checked: boolean) => {
    if (checked && !notificationSettings.enabled) {
      const granted = await requestNotificationPermission()
      if (!granted) return
      setNotificationSettings({ enabled: true, dailyReminder: true })
      return
    }
    setNotificationSettings({ dailyReminder: checked })
  }

  return (
    <>
      <h2 className="text-lg font-normal text-zinc-900">
        {t('settings.personalization')}
      </h2>
      <Separator className="mt-4 bg-zinc-200" />

      <div className="pt-4">
        <h3 className="text-base font-normal text-zinc-900">
          {t('settings.featureDefaults')}
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          {t('settings.featureDefaultsDesc')}
        </p>
      </div>

      <SettingRow label={t('settings.enablePlugins')}>
        <Switch
          size="sm"
          checked={featureDefaults.plugins}
          onCheckedChange={(checked) => setFeatureDefaults({ plugins: checked })}
        />
      </SettingRow>
      <Separator className="bg-zinc-200" />

      <SettingRow label={t('settings.enableWebSearch')}>
        <Switch
          size="sm"
          checked={featureDefaults.webSearch}
          onCheckedChange={(checked) =>
            setFeatureDefaults({ webSearch: checked })
          }
        />
      </SettingRow>
      <Separator className="bg-zinc-200" />

      <SettingRow label={t('settings.enableMemory')}>
        <Switch
          size="sm"
          checked={featureDefaults.memory}
          onCheckedChange={(checked) => setFeatureDefaults({ memory: checked })}
        />
      </SettingRow>
      <Separator className="bg-zinc-200" />

      <SettingRow label={t('settings.enableDeepThinking')}>
        <Switch
          size="sm"
          checked={featureDefaults.deepThinking}
          onCheckedChange={(checked) =>
            setFeatureDefaults({ deepThinking: checked })
          }
        />
      </SettingRow>
      <Separator className="bg-zinc-200" />

      <div className="pt-8">
        <h3 className="text-base font-normal text-zinc-900">
          {t('settings.notifications')}
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          {t('settings.notificationsDesc')}
        </p>
      </div>

      <SettingRow label={t('settings.enableNotifications')}>
        <Switch
          size="sm"
          checked={notificationSettings.enabled}
          onCheckedChange={handleNotificationToggle}
        />
      </SettingRow>
      <Separator className="bg-zinc-200" />

      <SettingRow label={t('settings.dailyReminder')}>
        <Switch
          size="sm"
          checked={notificationSettings.dailyReminder}
          onCheckedChange={handleDailyReminderToggle}
        />
      </SettingRow>
      <Separator className="bg-zinc-200" />

      <SettingRow label={t('settings.reminderTime')}>
        <input
          type="time"
          value={notificationSettings.reminderTime}
          onChange={(e) => setNotificationSettings({ reminderTime: e.target.value })}
          className="rounded-md border border-zinc-200 bg-transparent px-2 py-1 text-sm text-zinc-900 outline-none focus:border-zinc-400"
        />
      </SettingRow>
      <Separator className="bg-zinc-200" />
    </>
  )
}
