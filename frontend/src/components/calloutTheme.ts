import {
  MousePointerClick,
  Puzzle,
  Route,
  Target,
  Telescope,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'

/**
 * AI 输出的主题卡片（callout）类型。线上语法为专属语言标识的 code
 * fence，例如 ```concept … ```；这 6 个关键字是唯一契约，渲染器精确
 * 匹配它们，其余 fence 语言（js/python 等）不受影响，照常走代码块。
 */
export type CalloutType =
  | 'concept'
  | 'keypoint'
  | 'pitfall'
  | 'application'
  | 'proof'
  | 'example'

interface CalloutTheme {
  label: string
  icon: LucideIcon
  /** 强调色：竖条、图标、标签共用 */
  color: string
}

export const calloutThemes: Record<CalloutType, CalloutTheme> = {
  concept: { label: '概念', icon: Telescope, color: '#0047BB' },
  keypoint: { label: '重点', icon: Target, color: '#7A5A00' },
  pitfall: { label: '易错', icon: TriangleAlert, color: '#A34A35' },
  application: { label: '应用', icon: MousePointerClick, color: '#2F6F5E' },
  proof: { label: '证明', icon: Route, color: '#62558A' },
  example: { label: '举例', icon: Puzzle, color: '#2D728F' },
}

export const calloutTypes = Object.keys(calloutThemes) as CalloutType[]
