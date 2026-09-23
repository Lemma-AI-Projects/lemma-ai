// 课程域 wire 类型：契约真相在后端 backend/schemas/course.py，这里只做镜像。
// 层级为 课程 → 章(module) → 单元(lesson) → 学习点(point)，一个学习点绑定一个视频。
//
// status / buildStatus 描述的是「生成管线」状态，不是学习进度：课程一交付，
// 所有学习点都是 ready 而用户一节未学。学习进度走 completed /
// lastPositionSeconds（学习点）与 completedPointCount / totalPointCount
// （课程列表）这几个字段，进度环只能读它们，永远不要读生成管线字段。

/** 课程生命周期。intake/organizing/materializing 期间课程不可进入。 */
export type CourseStatus =
  | 'intake'
  | 'organizing'
  | 'materializing'
  | 'ready'
  | 'failed'

/** 学习点的生成管线状态。 */
export type PointBuildStatus =
  | 'not_started'
  | 'researching'
  | 'ready'
  | 'failed'

export interface CoursePoint {
  id: string
  title: string
  buildStatus: PointBuildStatus
  /** 学习进度：视频看过阈值后由后端置真，之后不会再变回 false。 */
  completed: boolean
  /** 断点续播位置（整秒），没看过为 0。 */
  lastPositionSeconds: number
}

export interface CourseLesson {
  id: string
  title: string
  /** 几句话的单元概述；模型未产出时为 null。 */
  summary: string | null
  points: CoursePoint[]
}

export interface CourseModule {
  id: string
  title: string
  summary: string | null
  lessons: CourseLesson[]
}

export interface CourseDetail {
  id: string
  title: string
  description: string | null
  /** 封面图 URL；尚未生成，当前恒为 null，仪表盘渲染占位块。 */
  coverUrl: string | null
  status: CourseStatus
  questionnaireReady: boolean
  modules: CourseModule[]
}

export interface CourseListItem {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  status: CourseStatus
  /**
   * 'video' | 'free' —— 两条并行的课程管线共用这张表，但不共用任何一个页面。
   * 自由课程没有学习点，所以卡片不显示学习进度，跳转也走 /free-course/:id。
   */
  mode: 'video' | 'free'
  createdAt: string
  updatedAt: string
  /** 已学完的学习点数；与 totalPointCount 一起算进度百分比。 */
  completedPointCount: number
  totalPointCount: number
}

// --- 学习点视频交付 ---

export type PointVideoStatus = 'ready' | 'downloading' | 'failed'

export interface PointVideoSource {
  platform: string
  title: string
  url: string
}

export interface PointVideoAuthor {
  name: string | null
  homepageUrl: string | null
}

export interface PointVideo {
  status: PointVideoStatus
  playbackUrl: string | null
  source: PointVideoSource
  author: PointVideoAuthor
  expiresAt: string | null
}
