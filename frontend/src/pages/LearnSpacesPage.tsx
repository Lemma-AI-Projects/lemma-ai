import { useState } from 'react'
import { FolderOpen, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LearnSpaceOnboardingDialog } from '@/features/learn-space/LearnSpaceOnboardingDialog'
import { useProjectsQuery } from '@/features/project/projectApi'

/**
 * Learn Spaces 总览页（/learn-spaces）
 * - UI 改名层：Project → Learn Space（数据层仍为 projects，E1.1 统一升级）
 * - 展示用户所有学习空间，点击进入 /project/:id（路由升级随 E1.1）
 * - 创建走 LearnSpaceOnboardingDialog（起名 → 伴学 agent 生成 → 创建）
 * 视觉风格与 ProjectPage / 侧栏分组完全一致（zinc 色调 + FolderOpen）。
 */
export function LearnSpacesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const projectsQuery = useProjectsQuery()
  const spaces = projectsQuery.data ?? []

  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      <div className="mx-auto flex min-h-full w-full max-w-[48rem] flex-col px-6 py-[8%]">
        <div className="mb-7 flex items-center justify-between">
          <div className="flex translate-x-2 items-center gap-3">
            <FolderOpen className="size-9 text-foreground" strokeWidth={1.75} />
            <h1 className="text-2xl font-medium text-foreground">Learn Spaces</h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full bg-transparent"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            New Learn Space
          </Button>
        </div>

        {projectsQuery.isPending ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : projectsQuery.isError ? (
          <p className="py-10 text-center text-sm text-zinc-400">加载失败，请刷新重试</p>
        ) : spaces.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-transparent py-14">
            <FolderOpen className="size-8 text-zinc-300" strokeWidth={1.5} />
            <p className="text-sm text-zinc-400">还没有学习空间</p>
            <p className="text-xs text-zinc-400">点击右上角「New Learn Space」创建第一个</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {spaces.map((item) => (
              <Link
                key={item.id}
                to={`/project/${item.id}`}
                className="group flex items-center gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50 px-4 py-5 transition-colors hover:bg-zinc-100"
              >
                <FolderOpen
                  className="size-5 shrink-0 text-zinc-500 transition-colors group-hover:text-zinc-900"
                  strokeWidth={1.75}
                />
                <span className="truncate text-sm font-medium text-zinc-900">
                  {item.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <LearnSpaceOnboardingDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
