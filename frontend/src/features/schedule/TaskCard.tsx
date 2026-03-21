import { Calendar, CircleCheckBig, Info, MessageSquare } from 'lucide-react'
import { CircularProgress } from '@/components/CircularProgress'

interface TagDef {
  label: string
  bg: string
  text: string
}

interface TaskCardProps {
  title: string
  description: string
  tags: readonly TagDef[]
  dueDate: string
  commentCount: number
  progress: { completed: number; total: number }
  overdue?: boolean
}

export function TaskCard({
  title,
  description,
  tags,
  dueDate,
  commentCount,
  progress,
  overdue,
}: TaskCardProps) {
  const { completed, total } = progress
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  const isDone = completed === total && total > 0

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          {isDone ? (
            <CircleCheckBig className="size-4 shrink-0 text-green-500" />
          ) : (
            <CircularProgress value={percent} size={14} strokeWidth={2} />
          )}
          <span className="flex-1 truncate text-sm font-medium">
            {title}
          </span>
          {overdue && !isDone && (
            <Info className="size-4 shrink-0 text-red-500" />
          )}
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
          {description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.label}
              className={`rounded-full border-transparent px-1.5 py-0.5 text-[10px] font-medium ${tag.bg} ${tag.text}`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      </div>
      <div className="border-t border-dashed border-border px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 rounded-sm border border-border px-2 py-1">
              <Calendar className="size-3" />
              {dueDate}
            </span>
            <span className="flex items-center gap-1.5 rounded-sm border border-border px-2 py-1">
              <MessageSquare className="size-3" />
              {commentCount}
            </span>
            <span className="flex items-center gap-1.5 rounded-sm border border-border px-2 py-1">
              {isDone ? (
                <CircleCheckBig className="size-3.5 text-green-500" />
              ) : (
                <CircularProgress value={percent} size={14} strokeWidth={2} />
              )}
              {completed}/{total}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
