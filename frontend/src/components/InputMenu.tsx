import { type ComponentProps, type ReactNode } from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'

// 菜单浮层层级：控制弹窗 z-index；当前值 z-50。
const inputMenuContentZIndexClassName = 'z-50'

// 菜单浮层宽度：控制弹窗最小宽度；当前值 min-w-[13rem]（约 208px）。
const inputMenuContentWidthClassName = 'min-w-[13rem]'

// 菜单浮层溢出：控制内容溢出裁切；当前值 overflow-hidden。
const inputMenuContentOverflowClassName = 'overflow-hidden'

// 菜单浮层圆角：控制弹窗外框圆角；当前值 rounded-md。
const inputMenuContentRadiusClassName = 'rounded-md'

// 菜单浮层边框：控制弹窗边框；当前值 border。
const inputMenuContentBorderClassName = 'border'

// 菜单浮层背景：控制弹窗背景色；当前值 bg-popover。
const inputMenuContentBackgroundClassName = 'bg-popover'

// 菜单浮层内边距：控制弹窗内容整体内边距；当前值 p-1。
const inputMenuContentPaddingClassName = 'p-1'

// 菜单浮层文字颜色：控制弹窗默认文字色；当前值 text-popover-foreground。
const inputMenuContentTextClassName = 'text-popover-foreground'

// 菜单浮层阴影：控制弹窗投影；当前值 shadow-none。
const inputMenuContentShadowClassName = 'shadow-none'

// 菜单浮层开合动画：控制打开/关闭时的淡入、缩放和方向滑入效果；当前值如下。
const inputMenuContentAnimationClassName = [
  'data-[state=open]:animate-in',
  'data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0',
  'data-[state=open]:fade-in-0',
  'data-[state=closed]:zoom-out-95',
  'data-[state=open]:zoom-in-95',
  'data-[side=bottom]:slide-in-from-top-1',
  'data-[side=left]:slide-in-from-right-1',
  'data-[side=right]:slide-in-from-left-1',
  'data-[side=top]:slide-in-from-bottom-1',
].join(' ')

const inputMenuContentClassName = [
  inputMenuContentZIndexClassName,
  inputMenuContentWidthClassName,
  inputMenuContentOverflowClassName,
  inputMenuContentRadiusClassName,
  inputMenuContentBorderClassName,
  inputMenuContentBackgroundClassName,
  inputMenuContentPaddingClassName,
  inputMenuContentTextClassName,
  inputMenuContentShadowClassName,
  inputMenuContentAnimationClassName,
].join(' ')

// 菜单项布局：控制每一行的定位、flex 布局、鼠标样式、选中限制和垂直居中；当前值如下。
const inputMenuItemLayoutClassName = [
  'relative',
  'flex',
  'cursor-default',
  'select-none',
  'items-center',
].join(' ')

// 菜单项间距：控制图标、文字、右侧元素之间的水平间距；当前值 gap-2.5。
const inputMenuItemGapClassName = 'gap-2.5'

// 菜单项圆角：控制 hover 背景的圆角；当前值 rounded-sm。
const inputMenuItemRadiusClassName = 'rounded-sm'

// 菜单项内边距：控制每一行的左右/上下留白；当前值 px-2 py-1.5。
const inputMenuItemPaddingClassName = 'px-2 py-1.5'

// 菜单项字号：控制菜单项文字大小；当前值 text-[14px]。
const inputMenuItemFontSizeClassName = 'text-[14px]'

// 菜单项字重：控制菜单项文字粗细；当前值 font-normal。字重不是像素，不能写 px；通常只用 100-900，超过范围或当前字体不支持的档位不会继续变粗。
const inputMenuItemFontWeightClassName = 'font-normal'

// 菜单项文字颜色：控制菜单项默认文字色；当前值 text-zinc-950。
const inputMenuItemTextColorClassName = 'text-zinc-950'

// 菜单项焦点轮廓：控制键盘/鼠标聚焦轮廓；当前值 outline-hidden。
const inputMenuItemOutlineClassName = 'outline-hidden'

// 菜单项过渡：控制 hover/高亮状态的颜色过渡；当前值 transition-colors。
const inputMenuItemTransitionClassName = 'transition-colors'

// 菜单项禁用态：控制 disabled 时不可点击和透明度；当前值如下。
const inputMenuItemDisabledClassName = [
  'data-[disabled]:pointer-events-none',
  'data-[disabled]:opacity-50',
].join(' ')

// 菜单项高亮态：控制 hover/键盘高亮时的背景和文字颜色；当前值如下。
const inputMenuItemHighlightedClassName = [
  'data-[highlighted]:bg-accent',
  'data-[highlighted]:text-zinc-950',
].join(' ')

const inputMenuItemClassName = [
  inputMenuItemLayoutClassName,
  inputMenuItemGapClassName,
  inputMenuItemRadiusClassName,
  inputMenuItemPaddingClassName,
  inputMenuItemFontSizeClassName,
  inputMenuItemFontWeightClassName,
  inputMenuItemTextColorClassName,
  inputMenuItemOutlineClassName,
  inputMenuItemTransitionClassName,
  inputMenuItemDisabledClassName,
  inputMenuItemHighlightedClassName,
].join(' ')

// 菜单图标尺寸：控制左侧 icon 大小；当前值 size-4（约 16px）。
const inputMenuIconSizeClassName = 'size-4'

// 菜单图标收缩：控制 icon 不被文字挤压；当前值 shrink-0。
const inputMenuIconShrinkClassName = 'shrink-0'

// 菜单图标颜色：控制左侧 icon 颜色；当前值 text-foreground（浅色主题下为黑色）。
const inputMenuIconColorClassName = 'text-foreground'

const inputMenuIconClassName = [
  inputMenuIconSizeClassName,
  inputMenuIconShrinkClassName,
  inputMenuIconColorClassName,
].join(' ')

// 子菜单箭头位置：控制右侧箭头靠右；当前值 ml-auto。
const inputMenuTrailingIconPositionClassName = 'ml-auto'

// 子菜单箭头尺寸：控制右侧箭头大小；当前值 size-4（约 16px）。
const inputMenuTrailingIconSizeClassName = 'size-4'

// 子菜单箭头收缩：控制右侧箭头不被文字挤压；当前值 shrink-0。
const inputMenuTrailingIconShrinkClassName = 'shrink-0'

// 子菜单箭头颜色：控制右侧箭头颜色；当前值 text-foreground（浅色主题下为黑色）。
const inputMenuTrailingIconColorClassName = 'text-foreground'

const inputMenuTrailingIconClassName = [
  inputMenuTrailingIconPositionClassName,
  inputMenuTrailingIconSizeClassName,
  inputMenuTrailingIconShrinkClassName,
  inputMenuTrailingIconColorClassName,
].join(' ')

// 菜单文字占位：控制 label 占满剩余空间；当前值 flex-1。
const inputMenuItemTextFlexClassName = 'flex-1'

// 菜单文字截断：控制 label 超长时单行省略；当前值 truncate。
const inputMenuItemTextTruncateClassName = 'truncate'

const inputMenuItemTextClassName = [
  inputMenuItemTextFlexClassName,
  inputMenuItemTextTruncateClassName,
].join(' ')

// 开关尺寸：控制菜单内 Switch 大小；当前值 size="sm"。
const inputMenuSwitchSize = 'sm'

// 开关事件：避免 Switch 自身抢走菜单项点击事件；当前值 pointer-events-none。
const inputMenuSwitchPointerClassName = 'pointer-events-none'

// 开关位置：控制 Switch 在菜单项右侧贴边；当前值 ml-auto。
const inputMenuSwitchPositionClassName = 'ml-auto'

// 开关阴影：控制 Switch 投影；当前值 shadow-none。
const inputMenuSwitchShadowClassName = 'shadow-none'

const inputMenuSwitchClassName = [
  inputMenuSwitchPointerClassName,
  inputMenuSwitchPositionClassName,
  inputMenuSwitchShadowClassName,
].join(' ')

// 子菜单宽度：控制二级菜单最小宽度；当前值 min-w-[11rem]（约 176px）。
const inputMenuSubContentWidthClassName = 'min-w-[11rem]'

// 分组标题内边距：控制 label 左右/上下留白；当前值 px-2 py-1。
const inputMenuLabelPaddingClassName = 'px-2 py-1'

// 分组标题字号：控制 label 文字大小；当前值 text-[11px]。
const inputMenuLabelFontSizeClassName = 'text-[11px]'

// 分组标题字重：控制 label 字重；当前值 font-medium。
const inputMenuLabelFontWeightClassName = 'font-medium'

// 分组标题颜色：控制 label 弱化文字色；当前值 text-muted-foreground。
const inputMenuLabelTextClassName = 'text-muted-foreground'

const inputMenuLabelClassName = [
  inputMenuLabelPaddingClassName,
  inputMenuLabelFontSizeClassName,
  inputMenuLabelFontWeightClassName,
  inputMenuLabelTextClassName,
].join(' ')

// 分隔线上下间距：控制 separator 与上下内容的距离；当前值 my-1。
const inputMenuSeparatorMarginClassName = 'my-1'

// 分隔线高度：控制 separator 线条粗细；当前值 h-px。
const inputMenuSeparatorHeightClassName = 'h-px'

// 分隔线颜色：控制 separator 颜色；当前值 bg-border。
const inputMenuSeparatorColorClassName = 'bg-border'

const inputMenuSeparatorClassName = [
  inputMenuSeparatorMarginClassName,
  inputMenuSeparatorHeightClassName,
  inputMenuSeparatorColorClassName,
].join(' ')

// 主菜单水平对齐：控制弹窗相对触发按钮的水平对齐方式；当前值 start。
const inputMenuDefaultAlign: ComponentProps<
  typeof DropdownMenuPrimitive.Content
>['align'] = 'start'

// 主菜单水平偏移：控制弹窗沿对齐轴的偏移距离；当前值 0px。这里必须写数字，例如 12 或 -12，不能写 '12px'。
const inputMenuDefaultAlignOffset = 0

// 主菜单弹出方向：控制弹窗出现在触发按钮哪一侧；当前值 top。
const inputMenuDefaultSide: ComponentProps<
  typeof DropdownMenuPrimitive.Content
>['side'] = 'top'

// 主菜单弹出距离：控制弹窗与触发按钮之间的距离；当前值 8px。
const inputMenuDefaultSideOffset = 8

// 主菜单模态行为：控制打开菜单时是否阻止外部交互；当前值 false。
const inputMenuDefaultModal = false

// 子菜单弹出距离：控制二级菜单与一级菜单之间的距离；当前值 6px。
const inputMenuSubDefaultSideOffset = 6

interface InputMenuProps {
  align?: ComponentProps<typeof DropdownMenuPrimitive.Content>['align']
  alignOffset?: number
  children: ReactNode
  contentClassName?: string
  modal?: boolean
  side?: ComponentProps<typeof DropdownMenuPrimitive.Content>['side']
  sideOffset?: number
  trigger: ReactNode
}

export function InputMenu({
  align = inputMenuDefaultAlign,
  alignOffset = inputMenuDefaultAlignOffset,
  children,
  contentClassName,
  modal = inputMenuDefaultModal,
  side = inputMenuDefaultSide,
  sideOffset = inputMenuDefaultSideOffset,
  trigger,
}: InputMenuProps) {
  return (
    <DropdownMenuPrimitive.Root modal={modal}>
      <DropdownMenuPrimitive.Trigger asChild>
        {trigger}
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          alignOffset={alignOffset}
          side={side}
          sideOffset={sideOffset}
          className={cn(inputMenuContentClassName, contentClassName)}
        >
          {children}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

interface InputMenuItemProps
  extends ComponentProps<typeof DropdownMenuPrimitive.Item> {
  icon?: LucideIcon
  label?: string
}

export function InputMenuItem({
  children,
  className,
  icon: Icon,
  label,
  ...props
}: InputMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(inputMenuItemClassName, className)}
      {...props}
    >
      {children ?? (
        <>
          {Icon && <Icon className={inputMenuIconClassName} />}
          {label && <span className={inputMenuItemTextClassName}>{label}</span>}
        </>
      )}
    </DropdownMenuPrimitive.Item>
  )
}

interface InputMenuSwitchItemProps {
  checked: boolean
  icon?: LucideIcon
  label: string
  onCheckedChange: (checked: boolean) => void
}

export function InputMenuSwitchItem({
  checked,
  icon: Icon,
  label,
  onCheckedChange,
}: InputMenuSwitchItemProps) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      onSelect={(event) => event.preventDefault()}
      className={inputMenuItemClassName}
    >
      {Icon && <Icon className={inputMenuIconClassName} />}
      <span className={inputMenuItemTextClassName}>{label}</span>
      <Switch
        size={inputMenuSwitchSize}
        checked={checked}
        aria-hidden
        tabIndex={-1}
        className={inputMenuSwitchClassName}
      />
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

interface InputMenuSubProps {
  children: ReactNode
  icon?: LucideIcon
  label: string
  sideOffset?: number
}

export function InputMenuSub({
  children,
  icon: Icon,
  label,
  sideOffset = inputMenuSubDefaultSideOffset,
}: InputMenuSubProps) {
  return (
    <DropdownMenuPrimitive.Sub>
      <DropdownMenuPrimitive.SubTrigger className={inputMenuItemClassName}>
        {Icon && <Icon className={inputMenuIconClassName} />}
        <span className={inputMenuItemTextClassName}>{label}</span>
        <ChevronRight className={inputMenuTrailingIconClassName} />
      </DropdownMenuPrimitive.SubTrigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.SubContent
          sideOffset={sideOffset}
          className={cn(inputMenuContentClassName, inputMenuSubContentWidthClassName)}
        >
          {children}
        </DropdownMenuPrimitive.SubContent>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Sub>
  )
}

export function InputMenuLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownMenuPrimitive.Label className={inputMenuLabelClassName}>
      {children}
    </DropdownMenuPrimitive.Label>
  )
}

export function InputMenuSeparator() {
  return (
    <DropdownMenuPrimitive.Separator className={inputMenuSeparatorClassName} />
  )
}
