import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  flattenPoints,
  useCompletionsQuery,
  useCoursesListQuery,
} from '@/features/course/courseApi'
import { isCourseCompleted } from '@/features/course/courseCenterFilters'
import { useCourseDetailQuery } from '@/hooks/useCourseDetail'
import { cn } from '@/lib/utils'

// 一个 session = 学完一个学习点。
const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

/** 以周一为第 0 天的本地序号（Date.getDay() 里周日是 0）。 */
function mondayBasedIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

/** 目标周周一的本地 00:00。offsetWeeks 为 -1 即上周。 */
function startOfWeek(base: Date, offsetWeeks: number): Date {
  const date = new Date(base)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - mondayBasedIndex(date) + offsetWeeks * 7)
  return date
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function CourseWeeklyProgressCard({ className }: { className?: string }) {
  const navigate = useNavigate()
  const coursesQuery = useCoursesListQuery()
  // 0 = 本周，-1 = 上周。卡片只提供这两周。
  const [weekOffset, setWeekOffset] = useState(0)
  const isCurrentWeek = weekOffset === 0

  // 整个会话固定同一个「现在」：每次渲染 new Date() 会让 query key 一直变。
  const now = useMemo(() => new Date(), [])
  const weekStart = useMemo(() => startOfWeek(now, weekOffset), [now, weekOffset])
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])
  const todayIndex = mondayBasedIndex(now)

  const completionsQuery = useCompletionsQuery(weekStart, weekEnd)
  const completions = completionsQuery.data

  // 窗口已经限定在这一周，所以按本地星期几归档即可（比按毫秒差取整更抗夏令时）。
  const dayCounts = useMemo(() => {
    const counts = Array.from({ length: 7 }, () => 0)
    for (const iso of completions ?? []) {
      counts[mondayBasedIndex(new Date(iso))] += 1
    }
    return counts
  }, [completions])

  const quickStartCourse = coursesQuery.data?.find(
    (course) => !isCourseCompleted(course)
  )
  // 「下一讲」= 该课程第一个没学完的学习点。详情与左侧课程卡共用 query key，
  // 同一页面里那份数据已经在取了，这里基本直接命中缓存。
  const quickStartDetailQuery = useCourseDetailQuery(quickStartCourse?.id)
  const nextPoint = useMemo(
    () =>
      flattenPoints(quickStartDetailQuery.data).find(
        (point) => !point.completed
      ),
    [quickStartDetailQuery.data]
  )

  return (
    <section
      aria-label="学习进展"
      className={cn(
        'flex flex-col overflow-hidden rounded-[20px] border border-zinc-200/80 bg-white p-4 text-zinc-950 shadow-[0_1px_3px_rgba(0,0,0,0.03)]',
        className
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] leading-4 font-medium text-zinc-500">
            {isCurrentWeek ? '本周' : '上周'}
          </p>
          {/* 占位块按 h2 的盒高（mt-1 + leading-6）取值，避免加载前后内容跳动。 */}
          {completionsQuery.isPending ? (
            <Skeleton className="mt-1 h-6 w-32" />
          ) : (
            <h2 className="mt-1 text-[20px] leading-6 font-semibold tracking-[-0.02em]">
              已学 {completions?.length ?? 0} 个 session
            </h2>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={!isCurrentWeek}
            onClick={() => setWeekOffset(-1)}
            className="size-7 rounded-full text-zinc-700 hover:bg-zinc-100 disabled:opacity-25"
            aria-label="显示上周"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={isCurrentWeek}
            onClick={() => setWeekOffset(0)}
            className="size-7 rounded-full text-zinc-700 hover:bg-zinc-100 disabled:opacity-25"
            aria-label="显示本周"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <p className="mt-1.5 max-w-[250px] shrink-0 text-[12.5px] leading-[18px] text-zinc-400">
        完成一个 session 后解锁你的 token 里程碑。
      </p>

      <div
        className="mt-3.5 grid shrink-0 grid-cols-7 gap-1.5"
        aria-label={isCurrentWeek ? '本周学习天数' : '上周学习天数'}
      >
        {WEEKDAY_LABELS.map((label, index) => {
          const isFuture = isCurrentWeek && index > todayIndex
          const isToday = isCurrentWeek && index === todayIndex
          return (
            <div
              key={label}
              className={cn(
                'flex h-[48px] min-w-0 flex-col items-center justify-center rounded-[11px] bg-zinc-100/80 text-zinc-400',
                isToday && 'bg-zinc-200/90 text-zinc-800'
              )}
            >
              <span className="text-[11px] leading-4 font-medium">{label}</span>
              <span className="text-[14px] leading-4 font-medium">
                {isFuture ? '–' : dayCounts[index]}
              </span>
            </div>
          )
        })}
      </div>

      {/* mt-auto 把快捷入口顶到卡片底部。标题单行截断，快捷卡高度固定，
          下边距仍是 p-4；overflow-hidden 兜住极端情况。 */}
      <div className="mt-auto min-h-0 overflow-hidden pt-3.5">
        <p className="text-[14px] leading-5 font-medium text-zinc-500">
          从上次学到的地方继续
        </p>

        <div className="mt-2">
          {coursesQuery.isPending ? (
            <div className="rounded-[14px] border border-zinc-200 p-3">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="mt-2 h-3 w-3/5" />
            </div>
          ) : coursesQuery.isError ? (
            <div className="rounded-[14px] border border-zinc-200 px-3 py-4 text-[12.5px] text-zinc-400">
              课程加载失败
            </div>
          ) : quickStartCourse ? (
            <button
              type="button"
              onClick={() => navigate(`/courses/${quickStartCourse.id}`)}
              className="w-full rounded-[14px] border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
            >
              <span className="block truncate text-[14.5px] leading-5 font-semibold text-zinc-900">
                {quickStartCourse.title}
              </span>
              {/* 占位块按第二行的盒高（mt-1.5 + leading-[18px]）取值。 */}
              {quickStartDetailQuery.isPending ? (
                <Skeleton className="mt-1.5 h-[18px] w-3/5" />
              ) : nextPoint ? (
                <span className="mt-1.5 block truncate text-[13px] leading-[18px] text-zinc-400">
                  下一讲：{nextPoint.title}
                </span>
              ) : null}
            </button>
          ) : (
            <div className="rounded-[14px] border border-zinc-200 px-3 py-4 text-[12.5px] text-zinc-400">
              暂无可继续的课程
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
