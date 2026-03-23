interface CurrentTimeBadgeProps {
  top: number
  label: string
}

export function CurrentTimeBadge({ top, label }: CurrentTimeBadgeProps) {
  return (
    <span
      className="pointer-events-none absolute left-1/2 z-20 rounded-full bg-red-500 px-2 text-xs leading-none text-white"
      style={{ top, paddingBlock: 3, transform: 'translate(-50%, calc(-50% + 0.5px))' }}
    >
      {label}
    </span>
  )
}
