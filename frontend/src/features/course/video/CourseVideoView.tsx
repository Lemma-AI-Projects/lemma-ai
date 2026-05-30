import type { CourseVideoContent } from '@/features/course/CourseMainContent'

interface CourseVideoViewProps {
  content: CourseVideoContent
}

export function CourseVideoView(_props: CourseVideoViewProps) {
  return (
    <div className="h-full min-h-0 overflow-y-auto p-2">
      <div className="aspect-video w-full rounded-md bg-zinc-200" />
    </div>
  )
}
