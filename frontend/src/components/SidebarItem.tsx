import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarItemProps {
  icon?: LucideIcon
  label: string
  active?: boolean
  onClick?: () => void
}

export function SidebarItem({
  icon: Icon,
  label,
  active = false,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-sm px-3 text-sm transition-colors',
        active
          ? 'bg-zinc-200/80 text-black'
          : 'text-black hover:bg-zinc-200/70'
      )}
    >
      {Icon && <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />}
      <span className="truncate">{label}</span>
    </button>
  )
}
