/**
 * 不属于组件的两个小东西。单独放，免得 `parts.tsx` 破坏 Fast Refresh。
 */

/** 四个视角共用的版心。左对齐、单列、720px —— 全页只有这一个宽度。 */
export const PAGE = 'mx-auto w-full max-w-[720px] px-8 pt-7 pb-20'

export function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}
