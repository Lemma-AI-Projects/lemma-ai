import { CircleCheckBig, Play, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'

import { BacklogStatusIcon } from '@/components/BacklogStatusIcon'
import { Button } from '@/components/ui/button'
import type { DashboardLesson, DashboardPoint } from './types'

function CoursePointRow({
  point,
  href,
}: {
  point: DashboardPoint
  href: string
}) {
  const Icon = point.completed ? RotateCcw : Play

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-4 shrink-0 items-center justify-center">
          {point.completed ? (
            <CircleCheckBig className="size-4 text-zinc-950" />
          ) : (
            <BacklogStatusIcon />
          )}
        </span>
        <p className="min-w-0 text-[16px] leading-6 font-normal text-zinc-800">
          {point.title}
        </p>
      </div>
      {/* 「练习」入口要等测验能力落地才出现，这里只给「学习」。 */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 rounded-full border border-zinc-300 bg-transparent px-3 text-[13px] text-zinc-600 hover:border-zinc-400 hover:bg-transparent hover:text-zinc-900"
      >
        <Link to={href}>
          <Icon className="size-3.5" />
          {point.completed ? '重新学习' : '学习'}
        </Link>
      </Button>
    </div>
  )
}

export function CourseDashboardLessonCard({
  courseId,
  lesson,
}: {
  courseId: string
  lesson: DashboardLesson
}) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-zinc-200 p-5">
      <h3 className="text-[17px] leading-6 font-semibold text-zinc-900">
        第{lesson.label}单元：{lesson.title}
      </h3>
      {lesson.summary ? (
        <p className="mt-2 text-[15px] leading-[24px] font-normal text-zinc-600">
          {lesson.summary}
        </p>
      ) : null}
      {lesson.points.length > 0 ? (
        <div className="mt-6 flex flex-col gap-6">
          {lesson.points.map((point) => (
            <CoursePointRow
              key={point.id}
              point={point}
              href={`/courses/${courseId}/points/${point.id}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
