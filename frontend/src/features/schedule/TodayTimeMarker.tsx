interface TodayTimeMarkerProps {
  top: number
}

export function TodayTimeMarker({ top }: TodayTimeMarkerProps) {
  return (
    <div
      className="pointer-events-none absolute -left-px -right-px z-10 flex items-center"
      style={{ top, transform: 'translateY(calc(-50% + 0.5px))' }}
    >
      <div className="h-2.5 w-0.5 shrink-0 bg-red-500" />
      <div className="h-[2px] flex-1 bg-red-500" />
    </div>
  )
}
