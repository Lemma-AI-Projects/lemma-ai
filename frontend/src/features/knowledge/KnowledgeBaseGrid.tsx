import { Check, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KnowledgeBaseFolder, KnowledgeBaseItem } from './getKnowledgeBaseItems'
import { KnowledgeBaseEmptyState } from './KnowledgeBaseEmptyState'
import { KnowledgeBaseItemMenu } from './KnowledgeBaseItemMenu'

export function KnowledgeBaseGrid({
  items,
  selectedItemIds,
  onToggleItem,
  onViewItem,
  onDownloadItem,
  folders,
  onMoveItem,
  emptyTitle,
}: {
  items: KnowledgeBaseItem[]
  selectedItemIds: string[]
  onToggleItem: (itemId: string) => void
  onViewItem: (item: KnowledgeBaseItem) => void
  onDownloadItem?: (item: KnowledgeBaseItem) => void
  folders: KnowledgeBaseFolder[]
  onMoveItem: (itemId: string, folderId: string | null) => void
  emptyTitle?: string
}) {
  if (items.length === 0) {
    return <KnowledgeBaseEmptyState title={emptyTitle} />
  }

  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col">
      <div className="relative">
        <div
          role="list"
          className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-4 gap-y-5"
        >
          {items.map((item) => {
            const { Icon } = item
            const isSelected = selectedItemIds.includes(item.id)
            const hasPreview = Boolean(item.previewUrl)

            return (
              <div
                key={item.id}
                role="listitem"
                className="min-w-0 animate-in fade-in-0 zoom-in-95 duration-300"
              >
                <div className="group relative flex w-full min-w-0 flex-col gap-2.5 text-start before:pointer-events-none before:absolute before:inset-x-8 before:bottom-2 before:h-3 before:rounded-full before:bg-black/20 before:opacity-0 before:blur-md before:content-[''] before:transition-opacity before:duration-300 before:ease-[cubic-bezier(0.22,1,0.36,1)] hover:before:opacity-35 focus-within:before:opacity-35">
                  <button
                    type="button"
                    aria-label={item.displayName}
                    className="w-full text-start outline-none focus-visible:rounded-[26px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50"
                    onClick={() => onToggleItem(item.id)}
                  >
                    <div
                      className={cn(
                        'relative h-[249px] w-full overflow-hidden rounded-[26px] border border-zinc-200 bg-background p-4 shadow-sm transition-[background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-muted/40 group-hover:shadow-md group-focus-within:bg-muted/40 group-focus-within:shadow-md',
                        isSelected && 'border-black ring-1 ring-black'
                      )}
                    >
                      {hasPreview ? (
                        <div className="absolute inset-0">
                          {item.previewKind === 'video' ? (
                            <video
                              src={item.previewUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <img
                              src={item.previewUrl}
                              alt={item.displayName}
                              className="h-full w-full object-cover"
                            />
                          )}
                          {/* 顶/底渐变保证标题与元信息在任意画面上都可读 */}
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-background/90 via-background/35 to-transparent" />
                        </div>
                      ) : null}

                      <div className="absolute inset-x-0 top-0 flex h-[91px] items-start py-[14px] ps-5 pe-24">
                        <div className="w-full text-[14px] leading-[18px] font-medium text-foreground">
                          <span className="line-clamp-2 break-words [overflow-wrap:anywhere]">
                            {item.displayName}
                          </span>
                        </div>
                      </div>

                      {hasPreview ? null : (
                        <div className="absolute start-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                          <Icon className={cn('size-10', item.iconColor)} />
                        </div>
                      )}

                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[68px]">
                        <div className="absolute inset-x-0 h-[68px] bg-gradient-to-b from-transparent via-background/85 to-background group-hover:via-muted/60 group-hover:to-muted/40 group-focus-within:via-muted/60 group-focus-within:to-muted/40" />
                      </div>

                      <div className="absolute inset-x-0 bottom-0 flex h-[68px] items-end px-5 py-[14px]">
                        <div className="w-full truncate text-[12px] leading-[16px] text-muted-foreground/70">
                          {item.extensionLabel} • {item.sizeLabel}
                        </div>
                      </div>
                    </div>
                  </button>
                <div className="absolute end-4 top-4 z-10 flex items-center gap-1.5">
                  <KnowledgeBaseItemMenu
                    itemId={item.id}
                    fileName={item.fileName}
                    folders={folders}
                    currentFolderId={item.folderId}
                    onView={() => onViewItem(item)}
                    onDownload={() => onDownloadItem?.(item)}
                    onMove={(folderId) => onMoveItem(item.id, folderId)}
                  />
                  <div className="relative flex size-6 items-center justify-center">
                    <input
                      readOnly
                      type="checkbox"
                      aria-label={`选择“${item.displayName}”`}
                      checked={isSelected}
                      className={cn(
                        'peer absolute inset-0 m-0 size-6 cursor-pointer appearance-none rounded-full border border-zinc-300 bg-background/80 transition-[opacity,background-color,border-color,box-shadow] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 focus-visible:outline-none',
                        isSelected
                          ? 'border-black bg-white opacity-100'
                          : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                      )}
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleItem(item.id)
                      }}
                    />
                    <Check className="pointer-events-none absolute size-4 text-black opacity-0 transition-opacity peer-checked:opacity-100" />
                  </div>
                </div>
                </div>

                <div className="absolute start-4 top-4 z-10">
                  <button
                    type="button"
                    aria-label={`查看“${item.displayName}”`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onViewItem(item)
                    }}
                    className="flex size-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    <Eye className="size-[17px]" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
