import type { ReactNode } from 'react'

import { calloutThemes, type CalloutType } from '@/components/calloutTheme'

/** Callout 纯展示卡片壳：彩色竖条 + 图标 + 标签头，正文由调用方注入。 */
export function CalloutCard({
  type,
  children,
}: {
  type: CalloutType
  children: ReactNode
}) {
  const { label, icon: Icon, color } = calloutThemes[type]

  return (
    <div
      data-slot="callout-card"
      data-callout={type}
      className="relative my-3 rounded-[16px] bg-zinc-100"
    >
      <span
        aria-hidden
        className="absolute left-[15px] top-[15px] h-[22px] w-[2.5px] rounded-full"
        style={{ backgroundColor: color }}
      />
      <Icon
        aria-hidden
        className="absolute left-[30px] top-[16px] size-[20px]"
        style={{ color }}
      />
      <span
        className="absolute left-[54.5px] top-[14px] text-[16px] font-medium leading-6"
        style={{ color }}
      >
        {label}
      </span>
      <div className="px-[30px] pb-8 pt-[58px]">{children}</div>
    </div>
  )
}
