import { Ellipsis, type LucideIcon } from 'lucide-react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { Link } from 'react-router-dom'

const sidebarMoreMenuItemClassName =
  'relative flex cursor-default items-center gap-2 rounded-md px-2 py-2 text-[14px] text-foreground outline-hidden select-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-foreground'
const sidebarMoreMenuContentClassName =
  'z-50 w-56 overflow-hidden rounded-md border bg-popover p-1.5 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'

export interface SidebarMoreMenuItem {
  id: string
  icon: LucideIcon
  label: string
}

export function SidebarMoreMenu({
  items,
  getHref,
}: {
  items: SidebarMoreMenuItem[]
  getHref: (item: SidebarMoreMenuItem) => string
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-sm px-3 text-sm text-black transition-colors hover:bg-zinc-200/70"
        >
          <Ellipsis className="size-[18px] shrink-0" strokeWidth={1.75} />
          <span className="truncate">More</span>
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          side="right"
          align="start"
          sideOffset={-28}
          onCloseAutoFocus={(event) => event.preventDefault()}
          className={sidebarMoreMenuContentClassName}
        >
          {items.map((item) => {
            const Icon = item.icon

            return (
              <DropdownMenuPrimitive.Item key={item.id} asChild>
                <Link
                  to={getHref(item)}
                  className={sidebarMoreMenuItemClassName}
                >
                  <Icon className="ml-0.5 size-[17px] shrink-0 text-inherit" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </DropdownMenuPrimitive.Item>
            )
          })}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
