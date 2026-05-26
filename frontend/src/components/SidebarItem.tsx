import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface SidebarItemProps {
  icon?: LucideIcon
  label: string
  to?: string
  end?: boolean
  onClick?: () => void
  collapsed?: boolean
}

export function SidebarItem({
  icon: Icon,
  label,
  to,
  end,
  onClick,
  collapsed = false,
}: SidebarItemProps) {
  const classes = (isActive: boolean) =>
    cn(
      'flex h-9 w-full items-center gap-2 rounded-sm px-3 text-sm transition-colors',
      isActive
        ? 'bg-zinc-200/80 text-black'
        : 'text-black hover:bg-zinc-200/70'
    )

  // Collapsed sidebar = 56px, icon = 18px, container px-3 = 12px.
  // To center the icon symmetrically: (56 - 18) / 2 - 12 = 7px shift.
  // We translate the icon instead of changing padding/gap so the transition
  // can interpolate smoothly alongside the parent's width animation.
  const iconEl = Icon && (
    <Icon
      className={cn(
        'size-[18px] shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        collapsed && 'translate-x-[7px]'
      )}
      strokeWidth={1.75}
    />
  )

  const labelEl = (
    <span
      aria-hidden={collapsed}
      className={cn(
        'truncate transition-[opacity,transform] duration-200 ease-out',
        collapsed && 'pointer-events-none -translate-x-1 opacity-0'
      )}
    >
      {label}
    </span>
  )

  if (to) {
    return (
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) => classes(isActive)}
        onClick={onClick}
      >
        {iconEl}
        {labelEl}
      </NavLink>
    )
  }

  return (
    <button type="button" onClick={onClick} className={classes(false)}>
      {iconEl}
      {labelEl}
    </button>
  )
}
