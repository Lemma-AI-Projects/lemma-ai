import { cn } from '@/lib/utils'
import { getProjectSourceItems } from './getProjectSourceItems'

export function ProjectSourceList({ projectId }: { projectId: string }) {
  const sources = getProjectSourceItems(projectId)

  if (sources.length === 0) return null

  return (
    <ol className="divide-y divide-border">
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
          </li>
        )
      })}
    </ol>
  )
}
