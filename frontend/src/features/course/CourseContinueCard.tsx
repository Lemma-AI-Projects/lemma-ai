import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface ContinueCourse {
  id: string
  title: string
  nextLectureTitle?: string
}

export interface CourseContinueCardProps {
  className?: string
  course?: ContinueCourse | null
  isPending?: boolean
  isError?: boolean
}

export function CourseContinueCard({
  className,
  course,
  isPending,
  isError,
}: CourseContinueCardProps) {
  const navigate = useNavigate()

  return (
    <section aria-label="继续学习" className={cn('min-w-0', className)}>
      <p className="text-[12px] leading-4 font-medium text-zinc-500">
        从上次学到的地方继续
      </p>

      <div className="mt-2">
        {isPending ? (
          <div className="rounded-[14px] border border-zinc-200 bg-white p-3">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="mt-2 h-3 w-3/5" />
          </div>
        ) : isError ? (
          <div className="rounded-[14px] border border-zinc-200 px-3 py-4 text-[12.5px] text-zinc-400">
            课程加载失败
          </div>
        ) : course ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(`/course/${course.id}`)}
            className="h-auto w-full flex-col items-start gap-0.5 rounded-[14px] border border-zinc-200 bg-white px-3 py-2.5 text-left hover:bg-zinc-50"
          >
            <span className="block w-full truncate text-[14.5px] leading-5 font-semibold text-zinc-900">
              {course.title}
            </span>
            <span className="mt-0.5 block w-full truncate text-[12px] leading-4 font-normal text-zinc-400">
              {course.nextLectureTitle
                ? `下一讲：${course.nextLectureTitle}`
                : '继续学习该课程'}
            </span>
          </Button>
        ) : (
          <div className="rounded-[14px] border border-zinc-200 px-3 py-4 text-[12.5px] text-zinc-400">
            暂无可继续的课程
          </div>
        )}
      </div>
    </section>
  )
}
