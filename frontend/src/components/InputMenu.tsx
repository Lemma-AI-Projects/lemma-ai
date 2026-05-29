import { type ComponentProps, type ReactNode } from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'

const inputMenuContentClassName =
  'z-50 min-w-[13rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1'

const inputMenuItemClassName =
  'relative flex cursor-default select-none items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px] text-foreground outline-hidden transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-foreground'

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
  align = 'start',
  alignOffset = 0,
  children,
  contentClassName,
  modal = false,
  side = 'top',
  sideOffset = 8,
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
          {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
          {label && <span className="flex-1 truncate">{label}</span>}
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
      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
      <span className="flex-1 truncate">{label}</span>
      <Switch
        size="sm"
        checked={checked}
        aria-hidden
        tabIndex={-1}
        className="pointer-events-none ml-auto shadow-none"
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
  sideOffset = 6,
}: InputMenuSubProps) {
  return (
    <DropdownMenuPrimitive.Sub>
      <DropdownMenuPrimitive.SubTrigger className={inputMenuItemClassName}>
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
        <span className="flex-1 truncate">{label}</span>
        <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuPrimitive.SubTrigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.SubContent
          sideOffset={sideOffset}
          className={cn(inputMenuContentClassName, 'min-w-[11rem]')}
        >
          {children}
        </DropdownMenuPrimitive.SubContent>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Sub>
  )
}

export function InputMenuLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownMenuPrimitive.Label className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
      {children}
    </DropdownMenuPrimitive.Label>
  )
}

export function InputMenuSeparator() {
  return <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
}
