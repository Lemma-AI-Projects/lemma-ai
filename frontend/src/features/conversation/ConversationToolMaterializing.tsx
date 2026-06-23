import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import type { CourseMaterializeProgress } from '@/features/coursePlanner/streamCourseOrganize'

// The materialization window (物料化门禁): after compose, every chapter's video +
// overview is pre-generated before the course is enterable. We show x/total
// progress; the course only becomes enterable (the `ready` stage) once all
// chapters are ready. A failed chapter fails the whole course (strict gate) and
// is surfaced via the error message on the `ready`/failed card.

export function ConversationToolMaterializing({
  title,
  materialize,
  errorMessage,
}: {
  title: string
  materialize: CourseMaterializeProgress | null
  errorMessage?: string | null
}) {
  const total = materialize?.total ?? 0
  const done = materialize?.done ?? 0
  const failed = materialize?.failed ?? 0
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div data-stage="materializing" className="flex flex-col">
      <h3 className="text-[19.5px] font-semibold leading-7 tracking-tight text-zinc-900">
        {title}
      </h3>

      <div className="mt-4 flex items-start gap-2 text-[16.5px] font-medium text-zinc-800">
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
          <Spinner aria-label="正在准备课程内容" className="size-[17px] text-zinc-900" />
        </span>
        <span className="min-w-0 flex-1 leading-5">
          正在准备课程内容（下载视频、生成章节概述）
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Progress
          value={percent}
          aria-label={`课程内容准备进度 ${percent}%`}
          className="min-w-0 flex-1 bg-zinc-200 [&_[data-slot=progress-indicator]]:bg-black [&_[data-slot=progress-indicator]]:duration-500 [&_[data-slot=progress-indicator]]:ease-out [&_[data-slot=progress-indicator]]:motion-reduce:transition-none"
        />
        <span className="shrink-0 text-[13px] tabular-nums text-zinc-500">
          {done}/{total}
        </span>
      </div>

      {failed > 0 ? (
        <p className="mt-2 text-[13px] text-amber-600">
          {failed} 个章节准备失败，可能影响进入课程
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  )
}
