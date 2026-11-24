// 下巴弹层里和 InputMenu 保持一致的两种基础样式，供用 Popover 自绘的菜单复用。

// 菜单小标题（与 InputMenuLabel 相同）。
export const COMPOSER_MENU_LABEL_CLASS_NAME =
  'px-2 py-1 text-[11px] font-medium text-muted-foreground'

// 菜单行（与 InputMenuItem 相同的尺寸和悬停底色）。
export const COMPOSER_MENU_ROW_CLASS_NAME =
  'flex w-full cursor-default items-center gap-2.5 rounded-sm px-2 py-1.5 text-[14px] text-zinc-950 outline-hidden transition-colors select-none hover:bg-accent focus-visible:bg-accent'

// 浅灰面板：菜单里由某个开关管着的一组设置，用底色而不是分割线和上面的开关分出层次。
// 配色和输入框本身一致：浅灰托盘里放带细边的白色块。
export const COMPOSER_PANEL_CLASS_NAME = 'rounded-sm bg-zinc-100'

// 面板里每组设置上方的小标题；不加左右内边距，和下面的选项、上面的开关行左对齐。
export const COMPOSER_PANEL_LABEL_CLASS_NAME =
  'pb-1.5 text-[11px] leading-4 font-medium text-zinc-500'

// 面板里被选中的选项：带细边的白片。
export const COMPOSER_PANEL_CHIP_SELECTED_CLASS_NAME =
  'bg-white ring-1 ring-zinc-200 ring-inset'
