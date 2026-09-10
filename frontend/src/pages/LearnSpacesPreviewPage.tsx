import { LearnSpacesView } from '@/features/learn-space/LearnSpacesView'
import type { ProjectItem } from '@/features/project/projectApi'

// 布局评审专用：不套 RequireAuth / AppLayout，直接喂 mock 数据，
// 不起后端、不登录即可查看学习空间总览页。
const previewSpaces: ProjectItem[] = [
  { id: '1', name: '线性代数 · 第 12 讲', updatedAt: '2026-09-09T08:00:00Z' },
  { id: '2', name: '机器学习基础', updatedAt: '2026-09-05T08:00:00Z' },
  { id: '3', name: '统计学要点', updatedAt: '2026-08-27T08:00:00Z' },
  { id: '4', name: '数据库系统笔记', updatedAt: '2026-08-22T08:00:00Z' },
]

export function LearnSpacesPreviewPage() {
  return (
    <div className="h-screen bg-zinc-100 p-2">
      <LearnSpacesView spaces={previewSpaces} />
    </div>
  )
}
