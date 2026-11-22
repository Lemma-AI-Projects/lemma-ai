/**
 * 不属于组件的几个常量。单独放，免得 `parts.tsx` 破坏 Fast Refresh。
 */

/** 四个视角共用的版心。全页只有这一个宽度。 */
export const PAGE = 'mx-auto w-full max-w-[720px] px-9 pt-8 pb-28'

/** 纸：主区那一张。比桌面浅一档，边缘一圈发丝线。 */
export const SHEET =
  'rounded-[3px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shadow-[0_1px_2px_rgba(27,26,23,0.05)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.45)]'

/** 浮层：右栏与暂存面板。两层影（近影贴边、远影铺开），暗色下加重。 */
export const FLOAT =
  'rounded-[3px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(27,26,23,0.06),0_16px_40px_-24px_rgba(27,26,23,0.22)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.55),0_18px_44px_-20px_rgba(0,0,0,0.8)]'

export function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}
