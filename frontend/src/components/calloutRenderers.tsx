import type { ReactNode } from 'react'
import type { CustomRenderer } from 'streamdown'

import { CalloutCard } from '@/components/CalloutCard'
import { calloutTypes } from '@/components/calloutTheme'

export interface CalloutContentProps {
  /** fence 内的原始 markdown 文本 */
  code: string
  /** 流式期间 fence 尚未闭合 */
  isIncomplete: boolean
}

/**
 * 把 6 个 callout 关键字注册为 Streamdown 自定义 fence 渲染器。
 * 正文渲染由各 markdown 封装注入自己的排版组件（嵌套渲染一层），
 * 使 components/ 层不反向依赖任何 feature。
 */
export function createCalloutRenderers(
  renderContent: (props: CalloutContentProps) => ReactNode
): CustomRenderer[] {
  return calloutTypes.map((type) => ({
    language: type,
    component: ({ code, isIncomplete }) => (
      <CalloutCard type={type}>
        {renderContent({ code, isIncomplete })}
      </CalloutCard>
    ),
  }))
}
