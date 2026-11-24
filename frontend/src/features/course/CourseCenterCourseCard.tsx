import { useState } from 'react'
import { Pin, Share2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CircularProgress } from '@/components/CircularProgress'
import type { CourseCenterCourse } from '@/features/course/courseCenterFilters'
import { toProgressPercent } from '@/features/course/courseProgress'
import { DeleteCourseDialog } from '@/features/course/DeleteCourseDialog'
import { cn } from '@/lib/utils'

function formatChineseDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

export function CourseCenterCourseCard({
  course,
  className,
  onOpen,
  onDelete,
}: {
  course: CourseCenterCourse
  className?: string
  onOpen?: () => void
  onDelete?: () => void
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const progressPercent = toProgressPercent(
    course.completedPointCount,
    course.totalPointCount
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
        {/* 第一个没学完的学习点，即下次该从哪儿接着看。 */}
        {course.resumePointTitle === undefined ? (
          <Skeleton className="mt-1 h-5 w-full" />
        ) : (
          <p className="mt-1 line-clamp-4 text-[15px] leading-[21px] font-semibold text-zinc-900">
            {course.resumePointTitle ??
              (course.totalPointCount > 0 ? '已全部学完' : '暂无学习点')}
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        onClick={onOpen}
        className="absolute right-4 bottom-[43px] h-8 rounded-full border border-zinc-300 bg-transparent px-3 text-[13px] font-medium text-zinc-600 hover:border-zinc-400 hover:bg-transparent hover:text-zinc-900"
      >
        前往课堂
      </Button>

      <div className="absolute top-6 right-[calc(25%+16px)] left-[204px]">
        <p className="text-[12px] leading-4 font-medium text-zinc-400">
          课程名称
        </p>
        <h2 className="mt-0.5 line-clamp-2 text-[20px] leading-[26px] font-bold tracking-[-0.015em] text-zinc-900">
          {course.title}
        </h2>
        <div className="mt-3 flex gap-2">
          <span
            title={`已学完 ${course.completedPointCount}/${course.totalPointCount} 个学习点`}
            className="flex h-6 items-center gap-[4px] rounded-full border border-zinc-300 pr-2 pl-[3px]"
          >
            <CircularProgress
              value={progressPercent}
              size={15}
              strokeWidth={2.5}
            />
            <span className="-translate-y-[0.1px] whitespace-nowrap text-[12.5px] font-semibold text-zinc-600">
              学习进度
            </span>
          </span>
          {/* 测验还没有后端契约（生成/提交/评分都未实现），恒为 0。 */}
          <span className="flex h-6 items-center gap-[4px] rounded-full border border-zinc-300 pr-2 pl-[3px]">
            <CircularProgress
              value={0}
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
            {course.typeLabel}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] leading-[18px] font-medium text-zinc-400">
            创建日期
          </p>
          <p className="mt-0.5 truncate text-[16px] leading-[22px] font-semibold text-zinc-800">
            {formatChineseDate(course.createdAt)}
          </p>
        </div>
      </div>

      {/* 封面：没有 coverUrl 时渲染占位块。 */}
      {course.coverUrl ? (
        <img
          src={course.coverUrl}
          alt=""
          className="size-[176px] shrink-0 rounded-[14px] object-cover"
        />
      ) : (
        <div className="size-[176px] shrink-0 rounded-[14px] border border-zinc-200/80" />
      )}

      <div className="mt-auto flex w-[176px] items-center justify-center gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="删除"
          onClick={() => setDeleteDialogOpen(true)}
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

      <DeleteCourseDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        courseTitle={course.title}
        onConfirm={() => {
          onDelete?.()
          setDeleteDialogOpen(false)
        }}
      />
    </div>
  )
}
