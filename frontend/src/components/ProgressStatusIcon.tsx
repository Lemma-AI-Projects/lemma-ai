import { CircleCheckBig } from 'lucide-react'
import { BacklogStatusIcon } from '@/components/BacklogStatusIcon'

export type ProgressStatus = 'not-started' | 'in-progress' | 'completed'

function InProgressStatusIcon({ value }: { value?: number }) {
  const radius = 2
  const circumference = 2 * Math.PI * radius
  const clampedValue = Math.min(Math.max(value ?? 33, 0), 100)
  const offset = circumference * (1 - clampedValue / 100)
  const dynamicProgressProps =
    value === undefined
      ? {
          strokeDasharray: '4.167846253762459 100',
          strokeDashoffset: 0,
        }
      : {
          strokeDasharray: circumference,
          strokeDashoffset: offset,
        }

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle
        cx="7"
        cy="7"
        r="6"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
        strokeDasharray="3.14 0"
        strokeDashoffset="-0.7"
      />
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        stroke="#22c55e"
        strokeWidth="4"
        {...dynamicProgressProps}
        transform="rotate(-90 7 7)"
      />
    </svg>
  )
}

export function ProgressStatusIcon({
  status,
  value,
}: {
  status: ProgressStatus
  value?: number
}) {
  if (status === 'completed') {
    return <CircleCheckBig className="size-4 text-green-500" />
  }

  if (status === 'in-progress') {
    return <InProgressStatusIcon value={value} />
  }

  return <BacklogStatusIcon />
}
