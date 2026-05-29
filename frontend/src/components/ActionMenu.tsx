import { type ComponentProps, type ReactNode } from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

type ActionMenuWidth = 'sm' | 'md' | 'lg'

const actionMenuContentWidthClassNames: Record<ActionMenuWidth, string> = {
  sm: 'w-44',
  md: 'w-48',
  lg: 'w-56',
}

const actionMenuItemClassName =
  'relative flex cursor-default items-center gap-2 rounded-md px-2 py-2 text-[14px] text-foreground outline-hidden select-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-foreground'
const actionMenuContentClassName =
  'z-50 overflow-hidden rounded-md border bg-popover p-1.5 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'

function getActionMenuContentClassName(
  width: ActionMenuWidth,
  className?: string
) {
  return cn(
    actionMenuContentClassName,
    actionMenuContentWidthClassNames[width],
    className
  )
}

interface ActionMenuProps {
  align?: ComponentProps<typeof DropdownMenuPrimitive.Content>['align']
  children: ReactNode
  contentClassName?: string
  onContentClick?: ComponentProps<typeof DropdownMenuPrimitive.Content>['onClick']
  side?: ComponentProps<typeof DropdownMenuPrimitive.Content>['side']
  sideOffset?: number
  trigger: ReactNode
  width?: ActionMenuWidth
}

export function ActionMenu({
  align = 'end',
  children,
  contentClassName,
  onContentClick,
  side,
  sideOffset = 8,
  trigger,
  width = 'md',
}: ActionMenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        {trigger}
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          side={side}
          sideOffset={sideOffset}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onClick={onContentClick}
          className={getActionMenuContentClassName(width, contentClassName)}
        >
          {children}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

interface ActionMenuItemProps
  extends ComponentProps<typeof DropdownMenuPrimitive.Item> {
  destructive?: boolean
  icon?: LucideIcon
  label?: string
}

export function ActionMenuItem({
  children,
  className,
  destructive = false,
  icon: Icon,
  label,
  ...props
}: ActionMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        actionMenuItemClassName,
        destructive &&
          'text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive',
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          {Icon && <Icon className="ml-0.5 size-[17px] shrink-0 text-inherit" />}
          {label && <span>{label}</span>}
        </>
      )}
    </DropdownMenuPrimitive.Item>
  )
}

interface ActionMenuSubProps {
  children: ReactNode
  icon: LucideIcon
  label: string
  onClick?: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>['onClick']
  sideOffset?: number
  width?: ActionMenuWidth
}

export function ActionMenuSub({
  children,
  icon: Icon,
  label,
  onClick,
  sideOffset = 8,
  width = 'md',
}: ActionMenuSubProps) {
  return (
    <DropdownMenuPrimitive.Sub>
      <DropdownMenuPrimitive.SubTrigger
        onClick={onClick}
        className={actionMenuItemClassName}
      >
        <Icon className="ml-0.5 size-[17px] shrink-0 text-inherit" />
        <span>{label}</span>
        <ChevronRight className="ml-auto translate-x-0.5 size-[19px] text-inherit" />
      </DropdownMenuPrimitive.SubTrigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.SubContent
          sideOffset={sideOffset}
          className={getActionMenuContentClassName(width)}
        >
          {children}
        </DropdownMenuPrimitive.SubContent>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Sub>
  )
}

export function ActionMenuSeparator() {
  return <DropdownMenuPrimitive.Separator className="mx-2 my-1 h-px bg-border" />
}
