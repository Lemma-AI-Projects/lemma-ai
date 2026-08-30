import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCoursesListQuery } from '@/features/course/courseLearningApi'
import { cn } from '@/lib/utils'

type WeekView = 'current' | 'previous'

interface WeekDay {
  day: string
  value: string
  active?: boolean
}

const currentWeekDays: WeekDay[] = [
  { day: '一', value: '0' },
  { day: '二', value: '0' },
  { day: '三', value: '0' },
  { day: '四', value: '0' },
  { day: '五', value: '1', active: true },
  { day: '六', value: '–' },
  { day: '日', value: '–' },
]

const previousWeekDays: WeekDay[] = currentWeekDays.map(({ day }) => ({
  day,
  value: '0',
}))

export function CourseWeeklyProgressCard({ className }: { className?: string }) {
  const navigate = useNavigate()
  const coursesQuery = useCoursesListQuery()
  const [weekView, setWeekView] = useState<WeekView>('current')
  const isCurrentWeek = weekView === 'current'
  const days = isCurrentWeek ? currentWeekDays : previousWeekDays
  const sessionCount = isCurrentWeek ? 1 : 0
  const quickStartCourse = coursesQuery.data?.find(
    (course) => course.status === 'ready'
  )

  return (
    <section
      aria-label="学习进展"
      className={cn(
        'rounded-[20px] border border-zinc-200/80 bg-white p-4 text-zinc-950 shadow-[0_1px_3px_rgba(0,0,0,0.03)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] leading-4 font-medium text-zinc-500">
            {isCurrentWeek ? '本周' : '上周'}
          </p>
          <h2 className="mt-1 text-[20px] leading-6 font-semibold tracking-[-0.02em]">
            已学 {sessionCount} 个 session
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={!isCurrentWeek}
            onClick={() => setWeekView('previous')}
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
            onClick={() => setWeekView('current')}
            className="size-7 rounded-full text-zinc-700 hover:bg-zinc-100 disabled:opacity-25"
            aria-label="显示本周"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <p className="mt-1.5 max-w-[250px] text-[12.5px] leading-[18px] text-zinc-400">
        完成一个 session 后解锁你的 token 里程碑。
      </p>

      <div
        className="mt-3.5 grid grid-cols-7 gap-1.5"
        aria-label={isCurrentWeek ? '本周学习天数' : '上周学习天数'}
      >
        {days.map((item) => (
          <div
            key={item.day}
            className={cn(
              'flex h-[48px] min-w-0 flex-col items-center justify-center rounded-[11px] bg-zinc-100/80 text-zinc-400',
              item.active && 'bg-zinc-200/90 text-zinc-800'
            )}
          >
            <span className="text-[11px] leading-4 font-medium">{item.day}</span>
            <span className="text-[14px] leading-4 font-medium">{item.value}</span>
          </div>
        ))}
      </div>

      <p className="mt-3.5 text-[12.5px] leading-4 font-medium text-zinc-500">
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
            onClick={() => navigate(`/course/${quickStartCourse.id}`)}
            className="w-full rounded-[14px] border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
          >
            <span className="block truncate text-[14.5px] leading-5 font-semibold text-zinc-900">
              {quickStartCourse.title}
            </span>
            <span className="mt-0.5 block text-[12px] leading-4 text-zinc-400">
              继续学习该课程
            </span>
          </button>
        ) : (
          <div className="rounded-[14px] border border-zinc-200 px-3 py-4 text-[12.5px] text-zinc-400">
            暂无可继续的课程
          </div>
        )}
      </div>
    </section>
  )
}
