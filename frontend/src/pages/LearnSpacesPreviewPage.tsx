import { LearnSpacesView } from '@/features/learn-space/LearnSpacesView'
import type { ProjectItem } from '@/features/project/projectApi'

// 布局评审专用：不套 RequireAuth / AppLayout，直接喂 mock 数据，
// 不起后端、不登录即可查看学习空间总览页。
//
// 空间名是**学科/目标级**的容器名（「期末复习」「线性代数」），不是章节名 ——
// 一个空间装一整门课（含它的课节、资料、对话），课节才有「第 N 讲」。
const previewSpaces: ProjectItem[] = [
  { id: '1', name: '期末复习', updatedAt: '2026-09-09T08:00:00Z' },
  { id: '2', name: '线性代数', updatedAt: '2026-09-05T08:00:00Z' },
  { id: '3', name: '机器学习基础', updatedAt: '2026-08-27T08:00:00Z' },
  { id: '4', name: '统计学要点', updatedAt: '2026-08-22T08:00:00Z' },
]

export function LearnSpacesPreviewPage() {
  return (
    <div className="h-screen bg-zinc-100 p-2">
      <LearnSpacesView spaces={previewSpaces} />
    </div>
  )
}
