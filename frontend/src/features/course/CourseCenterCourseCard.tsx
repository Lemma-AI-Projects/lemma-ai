import { Pin, Share2, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CircularProgress } from '@/components/CircularProgress'
import { useCoursesListQuery } from '@/features/course/courseLearningApi'
import { cn } from '@/lib/utils'

export function CourseCenterCourseCard({ className }: { className?: string }) {
  const navigate = useNavigate()
  const coursesQuery = useCoursesListQuery()
  const course = coursesQuery.data?.[0]
  const quickStartCourse = coursesQuery.data?.find(
    (item) => item.status === 'ready'
  )

  return (
    <div
      className={cn(
        'relative flex flex-col items-start rounded-[20px] border border-zinc-200/80 pt-3 pb-3 pl-3',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-3 right-1/4 bottom-3 border-l border-dashed border-zinc-300"
      />

      <div className="absolute top-6 right-4 left-[calc(75%+16px)]">
        <p className="text-[13px] leading-[18px] font-medium text-zinc-400">
          继续学习
        </p>
        {coursesQuery.isPending ? (
          <Skeleton className="mt-1 h-5 w-full" />
        ) : coursesQuery.isError ? (
          <p className="mt-1 text-[12px] leading-4 text-zinc-400">
            课程加载失败
          </p>
        ) : (
          <p className="mt-1 line-clamp-4 text-[15px] leading-[21px] font-semibold text-zinc-900">
            {quickStartCourse?.title ?? '暂无可继续的课程'}
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        disabled={!quickStartCourse}
        onClick={() => {
          if (quickStartCourse) navigate(`/course/${quickStartCourse.id}`)
        }}
        className="absolute right-4 bottom-[43px] h-8 rounded-full border border-zinc-300 bg-transparent px-3 text-[13px] font-medium text-zinc-600 hover:border-zinc-400 hover:bg-transparent hover:text-zinc-900"
      >
        前往课堂
      </Button>

      <div className="absolute top-6 right-[calc(25%+16px)] left-[204px]">
        <p className="text-[12px] leading-4 font-medium text-zinc-400">
          课程名称
        </p>
        {coursesQuery.isPending ? (
          <Skeleton className="mt-0.5 h-[26px] w-full" />
        ) : coursesQuery.isError ? (
          <p className="mt-0.5 text-sm leading-[26px] text-zinc-400">
            课程加载失败
          </p>
        ) : (
          <h2 className="mt-0.5 line-clamp-2 text-[20px] leading-[26px] font-bold tracking-[-0.015em] text-zinc-900">
            {course?.title ?? '暂无课程'}
          </h2>
        )}
        <div className="mt-3 flex gap-2">
          <span className="flex h-6 items-center gap-[4px] rounded-full border border-zinc-300 pr-2 pl-[3px]">
            <CircularProgress value={60} size={15} strokeWidth={2.5} />
            <span className="-translate-y-[0.1px] whitespace-nowrap text-[12.5px] font-semibold text-zinc-600">
              学习进度
            </span>
          </span>
          <span className="flex h-6 items-center gap-[4px] rounded-full border border-zinc-300 pr-2 pl-[3px]">
            <CircularProgress
              value={35}
              size={15}
              strokeWidth={2.5}
              progressColor="#eab308"
            />
            <span className="-translate-y-[0.1px] whitespace-nowrap text-[12.5px] font-semibold text-zinc-600">
              测验进度
            </span>
          </span>
        </div>
      </div>

      <div className="absolute right-[calc(25%+16px)] bottom-12 left-[204px] grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <p className="text-[13px] leading-[18px] font-medium text-zinc-400">
            课程类型
          </p>
          <p className="mt-0.5 truncate text-[16px] leading-[22px] font-semibold text-zinc-800">
            视频伴学课程
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] leading-[18px] font-medium text-zinc-400">
            创建日期
          </p>
          <p className="mt-0.5 truncate text-[16px] leading-[22px] font-semibold text-zinc-800">
            2026年9月5日
          </p>
        </div>
      </div>

      <div className="size-[176px] shrink-0 rounded-[14px] border border-zinc-200/80" />

      <div className="mt-auto flex w-[176px] items-center justify-center gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="删除"
          className="size-7 rounded-full border border-zinc-200 bg-transparent text-zinc-500 hover:bg-transparent hover:text-zinc-800"
        >
          <Trash2 className="size-[14px]" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="置顶"
          className="size-7 rounded-full border border-zinc-200 bg-transparent text-zinc-500 hover:bg-transparent hover:text-zinc-800"
        >
          <Pin className="size-[14px]" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="转发"
          className="size-7 rounded-full border border-zinc-200 bg-transparent text-zinc-500 hover:bg-transparent hover:text-zinc-800"
        >
          <Share2 className="size-[14px]" />
        </Button>
      </div>
    </div>
  )
}
