import { type ReactElement } from 'react'

import { CreditsPreviewPage } from './CreditsPreviewPage'
import { FocusActivityPreviewPage } from './FocusActivityPreviewPage'
import { FocusPreviewPage } from './FocusPreviewPage'
import { FreeCourseBlueprintPreviewPage } from './FreeCourseBlueprintPreviewPage'
import { FreeCourseTuningPreviewPage } from './FreeCourseTuningPreviewPage'
import { GoalPreviewPage } from './GoalPreviewPage'
import { InsightPreviewPage } from './InsightPreviewPage'
import { LearnSpaceGridPreviewPage } from './LearnSpaceGridPreviewPage'
import { LearnSpacesPreviewPage } from './LearnSpacesPreviewPage'
import { LearnSpaceWorkspacePreviewPage } from './LearnSpaceWorkspacePreviewPage'
import { OnboardingPreviewPage } from './OnboardingPreviewPage'
import { SchedulePreviewPage } from './SchedulePreviewPage'
import { SpaceCanvasPreviewPage } from './SpaceCanvasPreviewPage'
import { TrajectoryEventsPreviewPage } from './TrajectoryEventsPreviewPage'
import { TrajectoryPreviewPage } from './TrajectoryPreviewPage'
import { UserProfilePreviewPage } from './UserProfilePreviewPage'

/**
 * Preview 路由的**唯一清单**。
 *
 * 为什么要它存在：到 2026-10-23 为止 `/preview/*` 有 16 条、`/preview` 本身却**没有路由**
 * —— 找一个评审入口只能翻 AppRouter 的注释或问人。而且三个名字长得像的东西
 * （`learn-spaces` / `learn-space` / `learn-space-grid`）里两个是网格，没有一份清单
 * 就永远说不清谁是谁。
 *
 * 这份清单是**单一来源**：AppRouter 的路由表和 `/preview` 索引页都从这里渲染。
 * 新增 preview 时只改这里 —— 路由和索引自动同步，不会出现"索引页说有、点进去 404"。
 *
 * `note` 一栏写的是**这一条验什么**，从原 AppRouter 注释提炼；较长的设计理由
 * （比如两条 trajectory 为什么并存）保留在 note 里，不再散落在路由表中间。
 */

export interface PreviewRoute {
  path: string
  element: ReactElement
  label: string
  group: '聚焦与画布原型' | '产品页面（mock）' | '设计与研究评审'
  note: string
}

export const PREVIEW_ROUTES: PreviewRoute[] = [
  /* ── 聚焦与画布原型 ─────────────────────────────────────────────── */
  {
    path: '/preview/focus',
    element: <FocusPreviewPage />,
    label: '聚焦模式（现役）',
    group: '聚焦与画布原型',
    note: '真的 FocusView + mock 资料。现役布局的评审入口。',
  },
  {
    path: '/preview/focus-activity',
    element: <FocusActivityPreviewPage />,
    label: '聚焦 Proposal B（活动为中心）',
    group: '聚焦与画布原型',
    note: '活动为主对象；模拟 Agent 插入。支持 ?from=canvas&file=（Path B）与 ?sidebar=0&chat=0。',
  },
  {
    path: '/preview/space-canvas',
    element: <SpaceCanvasPreviewPage />,
    label: '画布 ↔ 聚焦 + 持续启示',
    group: '聚焦与画布原型',
    note: '三类元素（file 双击进 Proposal B / note 就地编辑 / interactive 特征向量实验）+ Insight 固定栏。',
  },
  /* ── 产品页面（mock）───────────────────────────────────────────── */
  {
    path: '/preview/learn-spaces',
    element: <LearnSpacesPreviewPage />,
    label: '网格总览',
    group: '产品页面（mock）',
    note: '学习空间的第一层列表。⚠️ 与 learn-space-grid 是两个东西。',
  },
  {
    path: '/preview/learn-space-grid',
    element: <LearnSpaceGridPreviewPage />,
    label: '网格模式（分组 + 卡片）',
    group: '产品页面（mock）',
    note: '分组 + 卡片 + 顶栏两个入口。',
  },
  {
    path: '/preview/learn-space',
    element: <LearnSpaceWorkspacePreviewPage />,
    label: '工作台（全屏画布）',
    group: '产品页面（mock）',
    note: '⚠️ 名字比网格只少一个 s，注意别点混。',
  },
  {
    path: '/preview/credits',
    element: <CreditsPreviewPage />,
    label: 'Credits 充值',
    group: '产品页面（mock）',
    note: '',
  },
  {
    path: '/preview/schedule',
    element: <SchedulePreviewPage />,
    label: '日程通知',
    group: '产品页面（mock）',
    note: '',
  },
  {
    path: '/preview/user-profile',
    element: <UserProfilePreviewPage />,
    label: '个人资料（/me）',
    group: '产品页面（mock）',
    note: '',
  },
  {
    path: '/preview/onboarding',
    element: <OnboardingPreviewPage />,
    label: 'Onboarding 8 屏',
    group: '产品页面（mock）',
    note: '认识你 → 校准 → 确认；出口接 /preview/user-profile。',
  },
  /* ── 设计与研究评审 ─────────────────────────────────────────────── */
  {
    path: '/preview/insight',
    element: <InsightPreviewPage />,
    label: '启示（三视图）',
    group: '设计与研究评审',
    note: '一条观察在空间 / 聚焦 / 轨迹三处的样子。设计：docs/design/adaptive-insight.md。',
  },
  {
    path: '/preview/goal',
    element: <GoalPreviewPage />,
    label: '学习目标（四屏并排）',
    group: '设计与研究评审',
    note: '空态 / 回述 / 正在推 / 已暂停。',
  },
  {
    path: '/preview/trajectory',
    element: <TrajectoryPreviewPage />,
    label: '轨迹 · 旧原型',
    group: '设计与研究评审',
    note: '画布 + 四问 + 依据抽屉，讲"我走了多远"。与下一条并存是有意的，不许合并。',
  },
  {
    path: '/preview/trajectory-events',
    element: <TrajectoryEventsPreviewPage />,
    label: '轨迹 · 真数据时间线',
    group: '设计与研究评审',
    note: '与真路由同一段代码（TrajectoryTimeline），fixture 数据，讲"到底发生了什么"。',
  },
  {
    path: '/preview/free-course-tuning',
    element: <FreeCourseTuningPreviewPage />,
    label: '免费课 · 调优',
    group: '设计与研究评审',
    note: '',
  },
  {
    path: '/preview/free-course-blueprint/:id',
    element: <FreeCourseBlueprintPreviewPage />,
    label: '免费课 · 蓝图',
    group: '设计与研究评审',
    note: '需要带一个 id。',
  },
]

export const PREVIEW_GROUPS: PreviewRoute['group'][] = [
  '聚焦与画布原型',
  '产品页面（mock）',
  '设计与研究评审',
]
