import { CircularProgress } from '@/components/CircularProgress'
import { Button } from '@/components/ui/button'

interface CourseDashboardProgressMarkerProps {
  label: string
  progress: number
  progressColor?: string
}

export function CourseDashboardProgressMarker({
  label,
  progress,
  progressColor,
}: CourseDashboardProgressMarkerProps) {
  return (
    <Button
      variant="ghost"
      aria-label={`${label} 学习进度`}
      className="relative size-8 rounded-full p-0"
    >
      {/* 显式 size-8 避免 Button 的默认 SVG 样式将圆环压缩到 16px。 */}
      <CircularProgress
        value={progress}
        size={32}
        strokeWidth={2.5}
        progressColor={progressColor}
        className="pointer-events-none absolute inset-0 size-8"
      />
      <span className="text-[13px] font-medium text-zinc-700">{label}</span>
    </Button>
  )
}
