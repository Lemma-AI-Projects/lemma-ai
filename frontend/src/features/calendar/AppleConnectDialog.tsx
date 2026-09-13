import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAppTranslation } from '@/i18n'
import {
  useAppleCalendarsQuery,
  useConnectAppleMutation,
} from './calendarApi'

interface AppleConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppleConnectDialog({
  open,
  onOpenChange,
}: AppleConnectDialogProps) {
  const { t } = useAppTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null)
  const connectMutation = useConnectAppleMutation()

  const canDiscover = username.length > 0 && password.length > 0
  const { data: calendars, isLoading: discovering } = useAppleCalendarsQuery(
    username,
    password,
    canDiscover && open
  )

  function handleConnect() {
    if (!selectedCalendar || !calendars) return
    const cal = calendars.find((c) => c.id === selectedCalendar)
    connectMutation.mutate(
      {
        username,
        password,
        calendarId: selectedCalendar,
        calendarName: cal?.name ?? 'iCloud Calendar',
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setUsername('')
          setPassword('')
          setSelectedCalendar(null)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('calendar.connectApple')}</DialogTitle>
          <DialogDescription>
            {t('calendar.appleDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-[#f5f5f5] p-4 text-sm text-[#737373]">
            {t('calendar.appleInstructions')}
          </div>

          <div className="space-y-3">
            <Input
              type="email"
              placeholder={t('calendar.icloudEmail')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-[8px] border-[#e5e5e5]"
            />
            <Input
              type="password"
              placeholder={t('calendar.appSpecificPassword')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-[8px] border-[#e5e5e5]"
            />
          </div>

          {discovering && (
            <div className="text-sm text-[#737373]">
              {t('calendar.discoveringCalendars')}
            </div>
          )}

          {calendars && calendars.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('calendar.selectCalendar')}
              </label>
              <div className="space-y-2">
                {calendars.map((cal) => (
                  <label
                    key={cal.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e5e5e5] p-3 transition-colors hover:bg-[#f5f5f5]"
                  >
                    <input
                      type="radio"
                      name="apple-calendar"
                      value={cal.id}
                      checked={selectedCalendar === cal.id}
                      onChange={() => setSelectedCalendar(cal.id)}
                      className="accent-black"
                    />
                    <span className="text-sm">{cal.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {calendars && calendars.length === 0 && (
            <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
              {t('calendar.noCalendarsFound')}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-[8px]"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!selectedCalendar || connectMutation.isPending}
            className="rounded-[8px] bg-black text-white hover:bg-black/90"
          >
            {connectMutation.isPending
              ? t('calendar.connecting')
              : t('calendar.connect')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
