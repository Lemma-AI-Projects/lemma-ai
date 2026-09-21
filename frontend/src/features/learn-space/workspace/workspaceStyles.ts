/**
 * 学习空间工作台的共用形状。
 *
 * 工作台是一整块白色画布，所以悬浮元素统一「白底 + 细边 + 极浅投影」：
 * 没有边框和投影，浮在白色背景上的胶囊会消失。
 */

/** 顶部工具条与底部 dock 共用的胶囊（空间名、缩放、翻页、底部槽位）。 */
export const WORKSPACE_PILL =
  'flex h-11 items-center rounded-full border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]'

/** 顶部工具条里的圆形图标按钮（关闭、标记、设置）。 */
export const WORKSPACE_ICON_BUTTON =
  'flex size-11 shrink-0 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-600 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10 disabled:cursor-default disabled:text-zinc-300'

/** 胶囊内的图标按钮（缩放 ±、翻页、底部 dock 槽位）。 */
export const WORKSPACE_PILL_BUTTON =
  'flex size-9 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10 disabled:cursor-default disabled:text-zinc-300 disabled:hover:bg-transparent'

/**
 * 胶囊内切换按钮的开启态（底部 dock 的庇护所 / 学习简报）。
 *
 * 与分段的 hover 底色区分开：hover 是浅灰，开启是黑底白字 ——
 * 否则鼠标划过时时分不清「选中了」还是「只是划过」。
 */
export const WORKSPACE_PILL_BUTTON_ACTIVE =
  'bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white'

/** 画布上的节点卡（对话）。 */
export const WORKSPACE_NODE_CARD =
  'flex min-h-[3.75rem] w-44 touch-none select-none items-center justify-center rounded-2xl bg-white px-4 py-4 text-center text-sm text-zinc-700 shadow-[0_1px_2px_rgba(16,24,40,0.06),0_10px_24px_-14px_rgba(16,24,40,0.35)] ring-1 ring-zinc-200/70 transition-shadow hover:shadow-[0_2px_4px_rgba(16,24,40,0.06),0_16px_32px_-14px_rgba(16,24,40,0.4)]'
