import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getProjectSourceItems } from './getProjectSourceItems'
import { ProjectSourceItemMenu } from './ProjectSourceItemMenu'

export function ProjectSourceList({ projectId }: { projectId: string }) {
  const sources = getProjectSourceItems(projectId)

  return (
    <ol className="divide-y divide-border">
      <li
        className="group/source-add flex min-h-14 cursor-pointer items-center gap-3 p-3 hover:bg-muted/50"
        onClick={() => toast.info('添加内容功能开发中，敬请期待')}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Plus className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 grow">
          <p className="truncate text-sm font-medium text-muted-foreground">
            添加内容
          </p>
        </div>
      </li>

      {sources.map((source) => {
        const { Icon, iconBg } = source
        return (
          <li
            key={source.id}
            className="group/source-item flex min-h-16 cursor-pointer items-center gap-3 p-3 hover:bg-muted/50"
          >
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-md',
                iconBg
              )}
            >
              <Icon className="size-5 text-white" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 grow">
              <p className="truncate text-sm font-medium text-foreground">
                {source.fileName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {source.categoryLabel} · {source.formattedDate}
              </p>
            </div>
            <div className="relative flex min-w-10 shrink-0 items-center justify-end">
              <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center opacity-0 transition-opacity group-hover/source-item:pointer-events-auto group-hover/source-item:opacity-100">
                <ProjectSourceItemMenu sourceId={source.id} />
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
