import {
  CircleCheckBig,
  PencilLine,
  Play,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react'

import { BacklogStatusIcon } from '@/components/BacklogStatusIcon'
import { Button } from '@/components/ui/button'
import type {
  CourseOverviewLearningPoint,
  CourseOverviewUnitCardData,
} from './types'

function CourseOverviewActionButton({
  icon: Icon,
  label,
}: {
  icon: LucideIcon
  label: string
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 rounded-full border border-zinc-300 bg-transparent px-3 text-[13px] text-zinc-600 hover:border-zinc-400 hover:bg-transparent hover:text-zinc-900"
    >
      <Icon className="size-3.5" />
      {label}
    </Button>
  )
}

function CourseOverviewLearningPointRow({
  point,
}: {
  point: CourseOverviewLearningPoint
}) {
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
      <div className="flex shrink-0 items-center gap-2">
        {!point.practiceOnly && (
          <CourseOverviewActionButton
            icon={point.completed ? RotateCcw : Play}
            label={point.completed ? '重新学习' : '学习'}
          />
        )}
        <CourseOverviewActionButton
          icon={PencilLine}
          label={point.practiceOnly ? '进入练习' : '练习'}
        />
      </div>
    </div>
  )
}

export function CourseOverviewUnitCard({
  card,
}: {
  card: CourseOverviewUnitCardData
}) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-zinc-200 p-5">
      <h3 className="text-[17px] leading-6 font-semibold text-zinc-900">
        {card.title}
      </h3>
      <p className="mt-2 text-[15px] leading-[24px] font-normal text-zinc-600">
        {card.summary}
      </p>
      {card.points && (
        <div className="mt-6 flex flex-col gap-6">
          {card.points.map((point) => (
            <CourseOverviewLearningPointRow key={point.id} point={point} />
          ))}
        </div>
      )}
    </div>
  )
}
