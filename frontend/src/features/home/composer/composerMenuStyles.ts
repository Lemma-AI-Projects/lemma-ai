// 下巴弹层里和 InputMenu 保持一致的两种基础样式，供用 Popover 自绘的菜单复用。

// 菜单小标题（与 InputMenuLabel 相同）。
export const COMPOSER_MENU_LABEL_CLASS_NAME =
  'px-2 py-1 text-[11px] font-medium text-muted-foreground'

// 菜单行（与 InputMenuItem 相同的尺寸和悬停底色）。
export const COMPOSER_MENU_ROW_CLASS_NAME =
  'flex w-full cursor-default items-center gap-2.5 rounded-sm px-2 py-1.5 text-[14px] text-zinc-950 outline-hidden transition-colors select-none hover:bg-accent focus-visible:bg-accent'

// 面板：菜单里由某个开关管着的一组设置，用底色而不是分割线和上面的开关分出层次。
// 配色和右上角的模式切换是同一种做法：浅灰轨道上放纯白的块，不描边。
export const COMPOSER_PANEL_CLASS_NAME = 'rounded-sm bg-zinc-200/60'

// 面板里被选中的选项。
export const COMPOSER_PANEL_SELECTED_CLASS_NAME = 'bg-white'

// 面板里没选中的选项悬停时。
export const COMPOSER_PANEL_IDLE_HOVER_CLASS_NAME = 'hover:bg-white/50'

// 面板里输入用的胶囊（比如截止日）：和选中项同一种白色填充，含悬停和打开状态。
export const COMPOSER_PANEL_FIELD_CLASS_NAME =
  'bg-white hover:bg-white/70 data-[state=open]:bg-white/70'

// 面板里每组设置上方的小标题；不加左右内边距，和下面的选项、上面的开关行左对齐。
export const COMPOSER_PANEL_LABEL_CLASS_NAME =
  'pb-1.5 text-[11px] leading-4 font-medium text-zinc-500'
