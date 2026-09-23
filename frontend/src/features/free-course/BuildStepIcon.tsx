import { Check, CircleAlert } from 'lucide-react'

import { Spinner } from '@/components/ui/spinner'
import type { FreeBuildStepStatus } from './types'

// The step row's state glyph, shared by the build card and the in-lesson
// generation so a step can never look "done" in one place and "running" in the
// other.
export function BuildStepIcon({
  status,
  isRunning,
}: {
  status: FreeBuildStepStatus
  /** The overall run is live (so a pending row shows a spinner, not a dot). */
  isRunning: boolean
}) {
  if (status === 'done') {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white">
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    )
  }
  if (status === 'failed') {
    return <CircleAlert className="size-4 shrink-0 text-destructive" />
  }
  if (status === 'running' || (status === 'pending' && isRunning)) {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center">
        <Spinner className="size-[13px] text-zinc-900" />
      </span>
    )
  }
  return <span className="size-1.5 shrink-0 rounded-full bg-zinc-300" />
}
