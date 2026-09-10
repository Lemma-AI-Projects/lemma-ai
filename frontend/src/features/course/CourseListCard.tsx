import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { CourseCenterCourse } from '@/features/course/courseCenterTypes'

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] leading-4 font-medium tracking-[0.06em] text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[12.5px] leading-4 text-zinc-600">
        {value}
      </p>
    </div>
  )
}

export interface CourseListCardProps {
  course: CourseCenterCourse
  /** 插图块位置：奇数行靠左、偶数行靠右，保持列表的节奏感 */
  illustrationPosition?: 'left' | 'right'
}

export function CourseListCard({
  course,
  illustrationPosition = 'left',
}: CourseListCardProps) {
  const { id, title, source, addedAt, progress, upNext, icon: Icon, tone } = course

  const illustration = (
    <div
      className={cn(
        'flex size-32 shrink-0 items-center justify-center rounded-[10px]',
        tone
      )}
    >
      <Icon className="size-9 text-zinc-600" strokeWidth={1.75} />
    </div>
  )

  const info = (
    <div className="flex min-w-0 flex-1 flex-col self-stretch">
      <p className="text-[11px] leading-4 font-medium tracking-[0.06em] text-zinc-400">
        课程名称
      </p>
      <h3 className="mt-1 truncate text-[17px] leading-6 font-semibold text-zinc-900">
        {title}
      </h3>

      <div className="mt-2 flex flex-wrap gap-x-10 gap-y-1.5">
        <MetaItem label="来源" value={source} />
        <MetaItem label="添加时间" value={addedAt} />
      </div>

      <div className="mt-auto flex items-center gap-3 pt-3.5">
        <div
          className="h-[3px] flex-1 overflow-hidden rounded-full bg-zinc-200"
          role="progressbar"
          aria-label={`${title} 学习进度`}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-zinc-800"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="w-9 shrink-0 text-right text-[12px] leading-4 font-medium tabular-nums text-zinc-500">
          {progress}%
        </span>
      </div>
    </div>
  )

  const illustrationOnLeft = illustrationPosition === 'left'

  return (
    <Link
      to={`/course/${id}`}
      className="group block rounded-[14px] border border-zinc-200 bg-white no-underline transition-shadow duration-200 hover:border-zinc-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50"
    >
      <div className="flex items-stretch">
        <div className="flex min-w-0 flex-1 items-center gap-4 p-4">
          {illustrationOnLeft ? (
            <>
              <div className="hidden shrink-0 sm:block">{illustration}</div>
              {info}
            </>
          ) : (
            <>
              {info}
              <div className="hidden shrink-0 sm:block">{illustration}</div>
            </>
          )}
        </div>

        {upNext ? (
          <>
            {/* 票根：虚线 + 上下半圆缺口，缺口色与页面底色一致 */}
            <div className="relative hidden w-px shrink-0 self-stretch md:block" aria-hidden="true">
              <span className="absolute inset-y-0 left-0 border-l border-dashed border-zinc-200" />
              <span className="absolute -top-[9px] -left-[8px] size-4 rounded-full bg-zinc-50" />
              <span className="absolute -bottom-[9px] -left-[8px] size-4 rounded-full bg-zinc-50" />
            </div>

            <div className="hidden w-[240px] shrink-0 flex-col justify-center px-5 lg:flex">
              <p className="text-[11px] leading-4 font-medium tracking-[0.06em] text-zinc-400">
                下一讲
              </p>
              <span className="mt-1.5 inline-flex w-fit items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[12px] leading-4 font-medium text-zinc-700">
                {upNext.label}
              </span>
              <p className="mt-2 line-clamp-2 text-[14px] leading-5 text-zinc-700">
                {upNext.title}
              </p>
            </div>
          </>
        ) : null}
      </div>
    </Link>
  )
}
