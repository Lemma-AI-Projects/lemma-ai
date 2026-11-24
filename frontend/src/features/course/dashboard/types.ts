// 仪表盘视图模型，承载「第几章」「一二三」这类纯展示的编号，以及由学习点
// 聚合出来的进度百分比。接入数据来源时由调用方映射成这个形态，不要把它当成契约。

export interface DashboardPoint {
  id: string
  title: string
  /** 学习者是否已学完这个学习点。 */
  completed: boolean
}

export interface DashboardLesson {
  id: string
  /** 章内单元编号，如「1」。 */
  label: string
  title: string
  summary: string | null
  /** 0–100，由单元内学习点的完成比例算出。 */
  progress: number
  points: DashboardPoint[]
}

export interface DashboardModule {
  id: string
  /** 章编号，如「1」。 */
  label: string
  /** 章标题里用的中文序号，如「一」。 */
  ordinalLabel: string
  title: string
  summary: string | null
  /** 0–100，按章内学习点总数聚合（长单元权重更大）。 */
  progress: number
  lessons: DashboardLesson[]
}

export interface CourseDashboardData {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  modules: DashboardModule[]
}
