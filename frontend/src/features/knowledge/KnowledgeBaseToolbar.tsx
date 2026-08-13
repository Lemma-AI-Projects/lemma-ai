import type { ReactNode } from 'react'
import {
  Check,
  Download,
  FileImage,
  FileText,
  FileType,
  Grid2X2,
  List,
  MessageCircle,
  Music2,
  Presentation,
  SlidersHorizontal,
  Sparkles,
  Table,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type KnowledgeBaseFilter = 'all' | 'image' | 'file'
export type KnowledgeBaseView = 'grid' | 'list'
export type KnowledgeBaseSourceFilter = 'uploaded' | 'generated' | null
export type KnowledgeBaseTypeFilter =
  | 'image'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'media'
  | 'pdf'
  | null

const filterLabels: Record<KnowledgeBaseFilter, string> = {
  all: '全部',
  image: '图片',
  file: '文件',
}

function FilterGroup({
  label,
  children,
  withSeparator,
}: {
  label: string
  children: ReactNode
  withSeparator?: boolean
}) {
  return (
    <div className={cn(withSeparator && 'mt-2 pt-2')}>
      {withSeparator && <div className="mx-4 mb-2 h-px bg-border" />}
      <div className="px-3 pb-1 pt-1 text-sm text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  )
}

function FilterItem({
  icon: Icon,
  label,
  selected,
  onSelect,
}: {
  icon: LucideIcon
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <DropdownMenuPrimitive.Item
      className="flex cursor-default select-none items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-accent"
      onSelect={onSelect}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-foreground" />
        <span className="truncate">{label}</span>
      </div>
      <span className="flex size-4 shrink-0 items-center justify-center">
        {selected && <Check className="size-4 text-foreground" />}
      </span>
    </DropdownMenuPrimitive.Item>
  )
}

export function KnowledgeBaseToolbar({
  filter,
  onFilterChange,
  sourceFilter,
  onSourceFilterChange,
  typeFilter,
  onTypeFilterChange,
  view,
  onViewChange,
  selectedCount,
}: {
  filter: KnowledgeBaseFilter
  onFilterChange: (filter: KnowledgeBaseFilter) => void
  sourceFilter: KnowledgeBaseSourceFilter
  onSourceFilterChange: (filter: KnowledgeBaseSourceFilter) => void
  typeFilter: KnowledgeBaseTypeFilter
  onTypeFilterChange: (filter: KnowledgeBaseTypeFilter) => void
  view: KnowledgeBaseView
  onViewChange: (view: KnowledgeBaseView) => void
  selectedCount: number
}) {
  const filters: KnowledgeBaseFilter[] = ['all', 'image', 'file']
  const hasSelection = selectedCount > 0
  const activeFilterCount = Number(sourceFilter !== null) + Number(typeFilter !== null)

  return (
    <div className="flex min-h-15 w-full flex-wrap items-center justify-between gap-4 py-2">
      <div className="relative min-w-0 flex-1 md:flex-initial">
        <div className="scrollbar-hidden flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto md:flex-wrap md:overflow-visible">
          {hasSelection ? (
            <>
              <Button
                type="button"
                className="h-9 min-h-9 shrink-0 rounded-full px-4 text-[14px] leading-5 font-medium tracking-[-0.18px]"
                onClick={() => toast.info('聊天功能开发中，敬请期待')}
              >
                <MessageCircle className="size-4" />
                开始聊天
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-9 min-h-9 shrink-0 rounded-full px-4 text-[14px] leading-5 font-medium tracking-[-0.18px]"
                onClick={() => toast.info('下载功能开发中，敬请期待')}
              >
                <Download className="size-4" />
                下载
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 min-h-9 shrink-0 rounded-full border-destructive/30 px-4 text-[14px] leading-5 font-medium tracking-[-0.18px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => toast.info('删除功能开发中，敬请期待')}
              >
                <Trash2 className="size-4" />
                删除
              </Button>
            </>
          ) : (
            filters.map((item) => (
            <Button
              key={item}
              type="button"
              variant="ghost"
              className={cn(
                'rounded-full bg-transparent px-4 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground',
                filter === item &&
                  'bg-muted text-foreground hover:bg-muted hover:text-foreground'
              )}
              onClick={() => onFilterChange(item)}
              aria-current={filter === item ? 'page' : undefined}
            >
              {filterLabels[item]}
            </Button>
            ))
          )}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 end-0 w-8 bg-gradient-to-l from-zinc-50 to-transparent md:hidden"
        />
      </div>

      <div className="ms-auto flex shrink-0 items-center gap-3">
        {hasSelection ? (
          <div className="text-[14px] leading-[18px] text-foreground">
            已选 {selectedCount} 个
          </div>
        ) : (
          <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="打开筛选器"
                className={cn(
                  'relative size-9 rounded-full text-muted-foreground',
                  activeFilterCount > 0 && 'bg-muted text-foreground'
                )}
              >
                <SlidersHorizontal className="size-5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-black text-[10px] font-medium leading-none text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content
                align="end"
                sideOffset={8}
                onCloseAutoFocus={(event) => event.preventDefault()}
                className="z-50 w-60 max-w-[95vw] overflow-hidden rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              >
                <FilterGroup label="源">
                  <FilterItem
                    icon={Upload}
                    label="已上传"
                    selected={sourceFilter === 'uploaded'}
                    onSelect={() =>
                      onSourceFilterChange(
                        sourceFilter === 'uploaded' ? null : 'uploaded'
                      )
                    }
                  />
                  <FilterItem
                    icon={Sparkles}
                    label="已生成"
                    selected={sourceFilter === 'generated'}
                    onSelect={() =>
                      onSourceFilterChange(
                        sourceFilter === 'generated' ? null : 'generated'
                      )
                    }
                  />
                </FilterGroup>

                <FilterGroup label="文件类型" withSeparator>
                  <FilterItem
                    icon={FileImage}
                    label="图片"
                    selected={typeFilter === 'image'}
                    onSelect={() =>
                      onTypeFilterChange(typeFilter === 'image' ? null : 'image')
                    }
                  />
                  <FilterItem
                    icon={FileText}
                    label="文档"
                    selected={typeFilter === 'document'}
                    onSelect={() =>
                      onTypeFilterChange(
                        typeFilter === 'document' ? null : 'document'
                      )
                    }
                  />
                  <FilterItem
                    icon={Table}
                    label="电子表格"
                    selected={typeFilter === 'spreadsheet'}
                    onSelect={() =>
                      onTypeFilterChange(
                        typeFilter === 'spreadsheet' ? null : 'spreadsheet'
                      )
                    }
                  />
                  <FilterItem
                    icon={Presentation}
                    label="演示文稿"
                    selected={typeFilter === 'presentation'}
                    onSelect={() =>
                      onTypeFilterChange(
                        typeFilter === 'presentation' ? null : 'presentation'
                      )
                    }
                  />
                  <FilterItem
                    icon={Music2}
                    label="媒体"
                    selected={typeFilter === 'media'}
                    onSelect={() =>
                      onTypeFilterChange(typeFilter === 'media' ? null : 'media')
                    }
                  />
                  <FilterItem
                    icon={FileType}
                    label="PDF"
                    selected={typeFilter === 'pdf'}
                    onSelect={() =>
                      onTypeFilterChange(typeFilter === 'pdf' ? null : 'pdf')
                    }
                  />
                </FilterGroup>
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>
        )}
        <div className="hidden h-5 w-px shrink-0 bg-zinc-200 md:block" />
        <div className="hidden items-center gap-2 md:flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="网格视图"
            aria-pressed={view === 'grid'}
            className={cn(
              'size-9 rounded-full text-muted-foreground',
              view === 'grid' && 'bg-muted text-foreground'
            )}
            onClick={() => onViewChange('grid')}
          >
            <Grid2X2 className="size-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="列表视图"
            aria-pressed={view === 'list'}
            className={cn(
              'size-9 rounded-full text-muted-foreground',
              view === 'list' && 'bg-muted text-foreground'
            )}
            onClick={() => onViewChange('list')}
          >
            <List className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
