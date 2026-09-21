import { useState } from 'react'
import { FolderOpen, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateProjectDialog } from '@/features/project/CreateProjectDialog'
import type { ProjectItem } from '@/features/project/projectApi'

export interface LearnSpacesViewProps {
  spaces: ProjectItem[]
  isPending?: boolean
  isError?: boolean
}

/** 学习空间总览（UI 改名层：数据层仍为 projects）。
 *
 * 与 main 的差异：去掉 i18next（main-v2 无此依赖），文案直接写中文；
 * 创建流程复用 main-v2 已有的 CreateProjectDialog（同为「起名 → 创建」）。
 */
export function LearnSpacesView({
  spaces,
  isPending,
  isError,
}: LearnSpacesViewProps) {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-[48rem] flex-col px-6 py-[8%]">
        {/* 装饰性点阵背景：极淡、不响应指针、置于内容之下并用椭圆蒙版柔和淡出 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(24,24,27,0.05) 1px, transparent 0)',
            backgroundSize: '24px 24px',
            maskImage:
              'radial-gradient(ellipse 80% 70% at 50% 25%, #000 40%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 80% 70% at 50% 25%, #000 40%, transparent 100%)',
          }}
        />
        <div className="mb-7 flex items-center justify-between">
          <div className="flex translate-x-2 items-center gap-3">
            <FolderOpen className="size-9 text-foreground" strokeWidth={1.75} />
            <h1 className="text-2xl font-medium text-foreground">学习空间</h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full bg-transparent"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            新建学习空间
          </Button>
        </div>

        {isPending ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-zinc-400">加载失败</p>
        ) : spaces.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-transparent py-14">
            <FolderOpen className="size-8 text-zinc-300" strokeWidth={1.5} />
            <p className="text-sm text-zinc-400">还没有学习空间</p>
            <p className="text-xs text-zinc-400">
              新建一个空间，把课程、资料与对话收在一处
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {spaces.map((item) => (
              <Link
                key={item.id}
                to={`/learn-spaces/${item.id}`}
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

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        copy={{
          title: '创建学习空间',
          nameLabel: '空间名称',
          namePlaceholder: '例如：线性代数',
          info: '学习空间把同一主题下的课程、资料、笔记与对话收在一处，方便持续往下推进。',
          submit: '创建空间',
          pending: '创建中…',
          failed: '创建学习空间失败，请重试',
        }}
        // 创建成功即进入该空间的工作台（参考稿的「创建成功 → 进界面」）。
        onCreated={(project) => navigate(`/learn-spaces/${project.id}`)}
      />
    </div>
  )
}
