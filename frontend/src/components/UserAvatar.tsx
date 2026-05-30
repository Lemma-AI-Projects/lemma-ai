import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface UserAvatarProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  name: string
  color?: string
  showBadge?: boolean
  size?: number
}

export function UserAvatar({
  name,
  color = '#FF8F50',
  showBadge = false,
  size = 32,
  className,
  style,
  ...props
}: UserAvatarProps) {
  return (
    <button
      type="button"
      className={cn(
        'relative flex cursor-pointer items-center justify-center',
        className
      )}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          fontSize: size / 2,
          lineHeight: 1,
        }}
      >
        <span className="font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
          {name[0].toUpperCase()}
        </span>
      </div>
      {showBadge && (
        <span className="-bottom-0.5 -right-0.5 absolute size-3 rounded-full border-2 border-white bg-yellow-400" />
      )}
    </button>
  )
}
