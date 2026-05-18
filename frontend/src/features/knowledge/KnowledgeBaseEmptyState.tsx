import { Search } from 'lucide-react'

export function KnowledgeBaseEmptyState() {
  return (
    <div className="mt-6">
      <div className="relative flex min-h-[321px] w-full items-center justify-center rounded-[28px] px-6 py-6 transition-colors sm:px-[106px]">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full text-zinc-300"
          focusable="false"
        >
          <rect
            x="0.5"
            y="0.5"
            width="calc(100% - 1px)"
            height="calc(100% - 1px)"
            rx="28"
            ry="28"
            fill="none"
            stroke="currentColor"
            strokeDasharray="5 3"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="flex flex-col items-center gap-4 text-center">
          <Search className="size-8 text-foreground" />
          <div className="text-[16px] font-medium leading-6 text-foreground">
            未找到文件
          </div>
        </div>
      </div>
    </div>
  )
}
