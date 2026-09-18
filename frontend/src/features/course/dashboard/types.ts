// 仪表盘视图模型：由后端 CourseDetail 派生（见 mapCourseDetailToDashboard）。
// 与 wire 类型分开，是因为这里额外承载「第几章」「一二三」这类纯展示的编号，
// 以及未来的学习进度——后端不下发编号，进度也还没实现。

export interface DashboardPoint {
  id: string
  title: string
  /** 学习进度尚未实现，当前恒为 false。 */
  completed: boolean
}

export interface DashboardLesson {
  id: string
  /** 章内单元编号，如「1」。 */
  label: string
  title: string
  summary: string | null
  /** 学习进度尚未实现，当前恒为 0。 */
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
  /** 学习进度尚未实现，当前恒为 0。 */
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
