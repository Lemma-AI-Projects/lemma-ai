import { useRef } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface KnowledgeBaseHeaderProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
}

export function KnowledgeBaseHeader({
  searchTerm,
  onSearchTermChange,
}: KnowledgeBaseHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="mt-9 mb-0 flex min-h-19 flex-wrap items-end gap-4">
      <h1 className="min-w-0 flex-1 text-[28px] leading-[34px] font-medium text-foreground">
        库
      </h1>

      <div className="flex w-full min-w-0 flex-nowrap items-center gap-3 md:ms-auto md:w-auto">
        <div className="min-w-0 flex-1 md:w-60 md:flex-none">
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
            />
            <input
              id="knowledge-base-search-input"
              type="text"
              autoComplete="off"
              aria-label="搜索资料库"
              placeholder="搜索资料库"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              className="h-9 w-full rounded-full border border-zinc-200 bg-background ps-9 pe-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/80 focus:border-zinc-300"
            />
          </div>
        </div>

        <div className="shrink-0">
          <input
            ref={inputRef}
            multiple
            tabIndex={-1}
            type="file"
            className="sr-only"
            onChange={() => toast.info('上传功能开发中，敬请期待')}
          />
          <Button
            type="button"
            className="rounded-full px-4"
            onClick={() => inputRef.current?.click()}
          >
            上传
          </Button>
        </div>
      </div>
    </div>
  )
}
