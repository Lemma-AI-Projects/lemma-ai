import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarSectionProps {
  title: string
  defaultOpen?: boolean
  showLine?: boolean
  children: ReactNode
}

export function SidebarSection({
  title,
  defaultOpen = true,
  showLine = true,
  children,
}: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    }
  }, [children])

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-full items-center gap-1.5 px-3 text-sm text-zinc-700 hover:text-zinc-900"
      >
        <span>{title}</span>
        <ChevronRight
          className={cn(
            'size-3.5 text-zinc-400 transition-transform duration-150',
            open && 'rotate-90'
          )}
        />
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
        style={{ maxHeight: open ? height ?? 'none' : 0 }}
      >
        <div ref={contentRef} className={cn('relative flex flex-col gap-0.5', showLine && 'pl-7')}>
          {showLine && <div className="absolute top-0 bottom-0 left-[18px] w-px bg-zinc-300" />}
          {children}
        </div>
      </div>
    </div>
  )
}
