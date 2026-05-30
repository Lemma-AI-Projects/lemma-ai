import { CalendarCheck2, CalendarClock, Languages } from 'lucide-react'
import { ActionChip } from '@/components/ActionChip'
import { CircularProgress } from '@/components/CircularProgress'
import { Button } from '@/components/ui/button'
import { ChatInput } from '@/features/home/ChatInput'
import { HomeUserMenu } from '@/features/home/HomeUserMenu'
import { suggestions } from '@/mock/homeSuggestions'

export function HomePage() {
  // TODO: wire to real schedule data (e.g. completed / total tasks for today).
  // Kept as a placeholder so the ring + icon swap can be exercised visually.
  const todayTaskProgress = 40
  const isAllTasksDone = todayTaskProgress >= 100
  const TaskIcon = isAllTasksDone ? CalendarCheck2 : CalendarClock

  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <Button
          variant="ghost"
          aria-label="Switch language"
          className="size-8 rounded-full border border-zinc-200 p-0"
        >
          <Languages className="size-[18px]" />
        </Button>
        <Button
          variant="ghost"
          aria-label="Today's task progress"
          className="relative size-8 rounded-full p-0"
        >
          {/* 32x32 ring with 1.5px stroke replaces the old `border
              border-zinc-200` outline; outer edge of the stroke still
              lands on the button box edge so it's pixel-aligned. */}
          <CircularProgress
            value={todayTaskProgress}
            size={32}
            strokeWidth={1.5}
            trackColor="transparent"
            /* `size-8` is required: Button has a cascade rule
               `[&_svg:not([class*='size-'])]:size-4` that would otherwise
               shrink the SVG element to 16x16 while leaving viewBox at
               32x32, visibly distorting and mispositioning the ring. */
            className="pointer-events-none absolute inset-0 size-8"
          />
          <TaskIcon className="size-[18px]" />
        </Button>
        <HomeUserMenu />
      </div>
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              What do you want to learn?
            </h1>
            <p className="text-sm text-zinc-500">
              Describe a topic, paste a link, or ask a question to get started.
            </p>
          </div>
          <ChatInput />
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <ActionChip
                key={s.label}
                icon={s.icon}
                iconColor={s.iconColor}
                label={s.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
