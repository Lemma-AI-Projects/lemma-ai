import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  GraduationCap,
  MessageCircle,
  Video,
  type LucideIcon,
} from 'lucide-react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type CourseSource = 'free-course' | 'video-course' | 'chat'

interface CourseSourceOption {
  value: CourseSource
  label: string
  labelMaxWidth: number
  iconColor: string
  Icon: LucideIcon
}

const courseSourceOptions: CourseSourceOption[] = [
  {
    value: 'free-course',
    label: '自由课程',
    labelMaxWidth: 58,
    iconColor: 'text-[#6f6ab5]',
    Icon: GraduationCap,
  },
  {
    value: 'video-course',
    label: '视频课程',
    labelMaxWidth: 58,
    iconColor: 'text-[#c4744e]',
    Icon: Video,
  },
  {
    value: 'chat',
    label: '随便聊聊',
    labelMaxWidth: 58,
    iconColor: 'text-[#4f8f73]',
    Icon: MessageCircle,
  },
]

const labelTransition = [
  'max-width 360ms cubic-bezier(0.22, 1, 0.36, 1)',
  'margin-left 360ms cubic-bezier(0.22, 1, 0.36, 1)',
  'opacity 260ms ease',
].join(', ')

export function CourseSourceSegmentedControl({
  className,
}: {
  className?: string
}) {
  const [value, setValue] = useState<CourseSource>('free-course')
  const rootRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Record<CourseSource, HTMLButtonElement | null>>({
    'free-course': null,
    'video-course': null,
    chat: null,
  })

  const syncIndicator = useCallback(() => {
    const root = rootRef.current
    const activeItem = itemRefs.current[value]

    if (!root || !activeItem) {
      return
    }

    root.style.setProperty(
      '--course-source-indicator-x',
      `${activeItem.offsetLeft}px`
    )
    root.style.setProperty(
      '--course-source-indicator-width',
      `${activeItem.offsetWidth}px`
    )
  }, [value])

  useLayoutEffect(() => {
    syncIndicator()

    const root = rootRef.current
    if (!root) {
      return
    }

    const resizeObserver = new ResizeObserver(syncIndicator)
    resizeObserver.observe(root)

    for (const item of Object.values(itemRefs.current)) {
      if (item) {
        resizeObserver.observe(item)
      }
    }

    return () => resizeObserver.disconnect()
  }, [syncIndicator])

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={100}>
      <ToggleGroup
        ref={rootRef}
        type="single"
        spacing={0}
        value={value}
        onValueChange={(nextValue) => {
          if (
            nextValue === 'free-course' ||
            nextValue === 'video-course' ||
            nextValue === 'chat'
          ) {
            setValue(nextValue)
          }
        }}
        aria-label="对话模式"
        className={cn(
          'relative inline-flex h-[34px] items-center gap-0.5 rounded-full border border-[#eaeaea] bg-[#fafafa] px-[2.5px] py-px shadow-[inset_0_1px_2px_rgba(0,0,0,0.02),0_1px_2px_rgba(255,255,255,0.9)] [--course-source-indicator-width:96px] [--course-source-indicator-x:3px]',
          className
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0.5 z-0 h-7 rounded-full bg-white shadow-[0_1px_5px_rgba(0,0,0,0.08)] transition-[width,transform] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            width: 'var(--course-source-indicator-width)',
            transform: 'translateX(var(--course-source-indicator-x))',
          }}
        />

        {courseSourceOptions.map((option) => {
          const isActive = value === option.value
          const { Icon } = option

          return (
            <Tooltip key={option.value} open={isActive ? false : undefined}>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  ref={(item) => {
                    itemRefs.current[option.value] = item
                  }}
                  value={option.value}
                  aria-label={option.label}
                  className="relative z-10 h-7 min-w-0 gap-0 rounded-full bg-transparent px-2 text-[13.5px] font-[650] leading-[13.5px] text-zinc-700 shadow-none transition-colors duration-200 hover:bg-transparent hover:text-zinc-950 data-[spacing=0]:rounded-full data-[spacing=0]:first:rounded-full data-[spacing=0]:last:rounded-full data-[state=on]:bg-transparent data-[state=on]:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-300"
                >
                  <Icon
                    className={cn(
                      'size-[18.5px] transition-opacity duration-200 ease-out',
                      option.iconColor,
                      isActive ? 'opacity-100' : 'opacity-[0.5]'
                    )}
                  />
                  <span
                    className="overflow-hidden whitespace-nowrap leading-[21.6px]"
                    style={{
                      maxWidth: isActive ? `${option.labelMaxWidth}px` : '0px',
                      marginLeft: isActive ? '7px' : '0px',
                      opacity: isActive ? 1 : 0,
                      transition: labelTransition,
                    }}
                  >
                    {option.label}
                  </span>
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="px-2 py-1 text-[11px]"
              >
                {option.label}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </ToggleGroup>
    </TooltipProvider>
  )
}
