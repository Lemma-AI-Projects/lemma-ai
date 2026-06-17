import { cn } from '@/lib/utils'

interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  trackColor?: string
  progressColor?: string
  className?: string
  // Ease the arc toward `value` instead of snapping (used for live build
  // progress, where backend beats arrive ~1s apart). Disabled under
  // prefers-reduced-motion.
  animated?: boolean
}

export function CircularProgress({
  value,
  size = 14,
  strokeWidth = 2,
  trackColor = '#EDEDED',
  progressColor = '#10b981',
  className,
  animated = false,
}: CircularProgressProps) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.min(Math.max(value, 0), 100) / 100)
  const center = size / 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0', className)}
    >
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      {value > 0 && (
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          className={cn(
            animated &&
              'transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none'
          )}
        />
      )}
    </svg>
  )
}
