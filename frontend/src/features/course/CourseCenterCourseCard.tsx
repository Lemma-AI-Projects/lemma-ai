import { useMemo, useState } from 'react'
import { Pin, Share2, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CircularProgress } from '@/components/CircularProgress'
import { flattenPoints } from '@/features/course/courseApi'
import { toProgressPercent } from '@/features/course/courseProgress'
import { DeleteCourseDialog } from '@/features/course/DeleteCourseDialog'
import { useCourseDetailQuery } from '@/hooks/useCourseDetail'
import { cn } from '@/lib/utils'
import type { CourseListItem } from '@/types/course'

function formatChineseDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

export function CourseCenterCourseCard({
  course,
  className,
}: {
  course: CourseListItem
  className?: string
}) {
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  // 自由课程不属于视频管线：它的「详情」是 units -> chapters -> 课节内容，
  // 走 /api/v1/free-courses/:id，拿视频课的详情只会得到一棵空树。所以直接不取。
  const isFree = course.mode === 'free'
  // 详情与仪表盘共用 query key，所以这次取数也顺带预热了「前往课堂」。
  const detailQuery = useCourseDetailQuery(course.id, { enabled: !isFree })
  const { resumePoint, hasPoints } = useMemo(() => {
    const points = flattenPoints(detailQuery.data)
    return {
      resumePoint: points.find((point) => !point.completed),
      hasPoints: points.length > 0,
    }
  }, [detailQuery.data])
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
        {isFree ? (
          <p className="mt-1 line-clamp-4 text-[15px] leading-[21px] font-semibold text-zinc-900">
            {course.description ?? '按课节推进的自由课程'}
          </p>
        ) : detailQuery.isPending ? (
          <Skeleton className="mt-1 h-5 w-full" />
        ) : (
          <p className="mt-1 line-clamp-4 text-[15px] leading-[21px] font-semibold text-zinc-900">
            {resumePoint?.title ?? (hasPoints ? '已全部学完' : '暂无学习点')}
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        onClick={() =>
          navigate(isFree ? `/free-course/${course.id}` : `/courses/${course.id}`)
        }
        className="absolute right-4 bottom-[43px] h-8 rounded-full border border-zinc-300 bg-transparent px-3 text-[13px] font-medium text-zinc-600 hover:border-zinc-400 hover:bg-transparent hover:text-zinc-900"
      >
        {isFree ? '前往课程' : '前往课堂'}
      </Button>

      <div className="absolute top-6 right-[calc(25%+16px)] left-[204px]">
        <p className="text-[12px] leading-4 font-medium text-zinc-400">
          课程名称
        </p>
        <h2 className="mt-0.5 line-clamp-2 text-[20px] leading-[26px] font-bold tracking-[-0.015em] text-zinc-900">
          {course.title}
        </h2>
        <div className="mt-3 flex gap-2">
          {isFree ? (
            // 自由课程按课节推进，没有「学习点」这个单位。显示一个 0/0 的进度环
            // 比不显示更糟——它会让人以为"一点都没学"。
            <span className="flex h-6 items-center rounded-full border border-zinc-300 px-2 text-[12.5px] font-semibold text-zinc-600">
              按课节推进
            </span>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      <div className="absolute right-[calc(25%+16px)] bottom-12 left-[204px] grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <p className="text-[13px] leading-[18px] font-medium text-zinc-400">
            课程类型
          </p>
          <p className="mt-0.5 truncate text-[16px] leading-[22px] font-semibold text-zinc-800">
            {isFree ? '自由课程' : '视频课程'}
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

      {/* 封面：后端 coverUrl 暂无生产者，恒为占位块。 */}
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
        courseId={course.id}
        courseTitle={course.title}
      />
    </div>
  )
}
