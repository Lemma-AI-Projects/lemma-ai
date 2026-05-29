import { Ellipsis, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActionMenu, ActionMenuItem } from './ActionMenu'

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
    <ActionMenu
      side="right"
      align="start"
      sideOffset={-28}
      width="lg"
      trigger={
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-sm px-3 text-sm text-black transition-colors hover:bg-zinc-200/70"
        >
          <Ellipsis className="size-[18px] shrink-0" strokeWidth={1.75} />
          <span className="truncate">More</span>
        </button>
      }
    >
      {items.map((item) => {
        const Icon = item.icon

        return (
          <ActionMenuItem key={item.id} asChild>
            <Link to={getHref(item)}>
              <Icon className="ml-0.5 size-[17px] shrink-0 text-inherit" />
              <span className="truncate">{item.label}</span>
            </Link>
          </ActionMenuItem>
        )
      })}
    </ActionMenu>
  )
}
