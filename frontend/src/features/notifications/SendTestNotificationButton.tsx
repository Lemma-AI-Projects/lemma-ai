import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { BellPlus, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { browserNotificationAdapter } from './browserAdapter'
import { notificationSender } from './notificationSender'

/**
 * The dev-only entry point: send yourself a notification without a Scheduler.
 *
 * This exists so the *sender* can be exercised on its own. It is deliberately a
 * plain button calling `notificationSender.send()` — the same call a Scheduler
 * will make — and not a test-only back door that writes to the feed directly.
 * Testing the real path is the point.
 *
 * It is the ONLY place that asks for browser permission, and it does so on a
 * click because that is the only moment a browser will show the prompt. The
 * order is: ask (best effort) → send. A refusal does not stop the send; it just
 * means the feed item arrives without a system toast.
 */

/** The demo content: the same shape a Scheduler would produce for a review. */
function demoNotification() {
  // The date is part of the payload, not only the card's stamp: a real Scheduler
  // knows WHEN the learner studied and says so. Three days back is the classic
  // first review interval, and it is a mock date the reviewer can check against
  // the card's own date chip.
  const studiedOn = format(subDays(new Date(), 3), 'MMM d')
  return {
    title: 'Review reminder',
    body: `You studied Eigenvectors on ${studiedOn} — worth re-checking the proof.`,
    type: 'reminder',
    metadata: { source: 'manual_test' },
  } as const
}

type Status = 'idle' | 'sending' | 'sent' | 'error'

export function SendTestNotificationButton() {
  const [status, setStatus] = useState<Status>('idle')

  const permission = browserNotificationAdapter.permission()
  const browserBlocked =
    browserNotificationAdapter.isSupported() && permission === 'denied'

  async function handleClick() {
    setStatus('sending')
    // Permission first: it needs the user gesture, and asking after the send
    // would mean this click never produces a system notification.
    await browserNotificationAdapter.ensurePermission()
    try {
      await notificationSender.send({ ...demoNotification() })
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="mt-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleClick}
        disabled={status === 'sending'}
      >
        {status === 'sending' ? (
          <Loader2 className="animate-spin" />
        ) : (
          <BellPlus />
        )}
        Send test notification
      </Button>
      {status === 'sent' && (
        <p className="mt-1.5 text-[10px] text-zinc-500">
          Sent — see Reminders below.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-1.5 text-[10px] text-red-600">
          Send failed — nothing was delivered.
        </p>
      )}
      {status !== 'error' && browserBlocked && (
        <p className="mt-1.5 text-[10px] text-zinc-400">
          Browser notifications are blocked for this site; the feed still works.
        </p>
      )}
    </div>
  )
}
