import type { LucideIcon } from 'lucide-react'

export type CourseCenterTab = 'all' | 'in-progress' | 'completed'

export type CourseCenterStatus = 'not-started' | 'in-progress' | 'completed'

export interface CourseCenterUpNext {
  /** 徽章文案，如「Lecture」「练习」 */
  label: string
  title: string
}

/** 课程中心列表的渲染模型。
 *
 * 只服务于课程中心这一张页面：后端当前只下发 id/title/status/updatedAt，
 * 进度与「下一讲」还没有真实来源，因此这两个字段在数据缺失时允许为空，
 * 卡片据此省略对应区块，而不是填假值。
 */
export interface CourseCenterCourse {
  id: string
  title: string
  source: string
  /** 已格式化好的展示文案，如 `2026/09/09` */
  addedAt: string
  /** 0 - 100 */
  progress: number
  status: CourseCenterStatus
  upNext?: CourseCenterUpNext
  icon: LucideIcon
  /** 插图块配色类（保持中性，不引入品牌色） */
  tone: string
}
