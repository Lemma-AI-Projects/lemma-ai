import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppTranslation } from '@/i18n'
import { env } from '@/lib/env'

interface GoogleConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoogleConnectDialog({
  open,
  onOpenChange,
}: GoogleConnectDialogProps) {
  const { t } = useAppTranslation()

  function handleConnect() {
    const redirectUri = env.googleRedirectUri
    // In a real implementation, redirect to Google OAuth
    // For now, show a placeholder
    window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline&prompt=consent`,
      '_blank'
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('calendar.connectGoogle')}</DialogTitle>
          <DialogDescription>
            {t('calendar.googleDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-[#f5f5f5] p-4 text-sm text-[#737373]">
            {t('calendar.googleInstructions')}
          </div>
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
            className="rounded-[8px] bg-black text-white hover:bg-black/90"
          >
            {t('calendar.continueToGoogle')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
