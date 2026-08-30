import { useState, type CSSProperties } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CourseCenterTab = 'all' | 'in-progress' | 'completed'

const tabs: Array<{ value: CourseCenterTab; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'in-progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
]

const COURSE_CENTER_TOOLBAR_STYLE = {
  // 搜索框与 Tab 组的水平间距；增大时搜索框向右移动。
  '--course-center-search-gap': '120px',
  // 搜索框宽度。
  '--course-center-search-width': '300px',
} as CSSProperties

export function CourseCenterTabs() {
  const [activeTab, setActiveTab] = useState<CourseCenterTab>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // py-2 控制工具栏上下各 8px 的内部留白。
  return (
    <div
      style={COURSE_CENTER_TOOLBAR_STYLE}
      className="flex min-h-15 w-full flex-col gap-4 py-2 md:flex-row md:flex-nowrap md:items-center md:gap-0"
    >
      {/* gap-2 控制各 Tab 之间 8px 的水平间距。 */}
      <div
        role="tablist"
        aria-label="课程状态"
        className="flex shrink-0 flex-nowrap items-center gap-2"
      >
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            role="tab"
            variant="ghost"
            aria-selected={activeTab === tab.value}
            className={cn(
              // px-4 控制每个 Tab 按钮左右各 16px 的内部留白。
              'rounded-full bg-transparent px-4 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground',
              activeTab === tab.value &&
                'bg-muted text-foreground hover:bg-muted hover:text-foreground'
            )}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="w-full min-w-0 md:ml-[var(--course-center-search-gap)] md:w-[var(--course-center-search-width)] md:flex-none">
        <div className="relative w-full">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <input
            id="course-center-search-input"
            type="text"
            autoComplete="off"
            aria-label="搜索课程"
            placeholder="搜索课程"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-[34px] w-full rounded-full border border-zinc-200 bg-background ps-9 pe-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/80 focus:border-zinc-300"
          />
        </div>
      </div>
    </div>
  )
}
