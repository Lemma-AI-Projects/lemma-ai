interface CurrentTimeIndicatorProps {
  top: number
}

export function CurrentTimeIndicator({ top }: CurrentTimeIndicatorProps) {
  return (
    <div
      className="pointer-events-none absolute -left-3 right-0 z-10"
      style={{ top }}
    >
      <div className="h-px bg-red-500" />
    </div>
  )
}
