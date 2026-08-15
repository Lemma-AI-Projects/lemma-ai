import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface SidebarItemProps {
  icon?: LucideIcon
  label: string
  to?: string
  end?: boolean
  onClick?: () => void
  /** 右侧插槽（如余额徽标），在 label 之后右对齐渲染。 */
  trailing?: ReactNode
}

export function SidebarItem({
  icon: Icon,
  label,
  to,
  end,
  onClick,
  trailing,
}: SidebarItemProps) {
  const classes = (isActive: boolean) =>
    cn(
      'flex h-9 w-full items-center gap-2 rounded-sm px-3 text-sm transition-colors',
      isActive
        ? 'bg-zinc-200/80 text-black'
        : 'text-black hover:bg-zinc-200/70'
    )

  if (to) {
    return (
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) => classes(isActive)}
        onClick={onClick}
      >
        {Icon && <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />}
        <span className="truncate">{label}</span>
        {trailing && <span className="ml-auto shrink-0">{trailing}</span>}
      </NavLink>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={classes(false)}
    >
      {Icon && <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />}
      <span className="truncate">{label}</span>
      {trailing && <span className="ml-auto shrink-0">{trailing}</span>}
    </button>
  )
}
