import { ArrowDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KnowledgeBaseItem } from './getKnowledgeBaseItems'
import { KnowledgeBaseEmptyState } from './KnowledgeBaseEmptyState'
import { KnowledgeBaseItemMenu } from './KnowledgeBaseItemMenu'

function SelectionCheckbox({
  label,
  checked,
  indeterminate,
  onToggle,
}: {
  label: string
  checked: boolean
  indeterminate?: boolean
  onToggle: () => void
}) {
  return (
    <div className="relative flex size-[18px] items-center justify-center transition-opacity">
      <input
        readOnly
        type="checkbox"
        aria-label={label}
        checked={checked}
        className={cn(
          'peer size-full cursor-pointer appearance-none rounded-[4px] border border-zinc-300 bg-background transition-colors checked:border-black checked:bg-black focus:outline-none',
          indeterminate && 'border-black bg-black'
        )}
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
      />
      <Check className="pointer-events-none absolute inset-0 m-auto hidden size-3 text-white peer-checked:block" />
      {indeterminate && !checked && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto h-[2px] w-2 rounded-full bg-white"
        />
      )}
    </div>
  )
}

export function KnowledgeBaseList({
  items,
  selectedItemIds,
  onToggleItem,
  onToggleAllVisible,
}: {
  items: KnowledgeBaseItem[]
  selectedItemIds: string[]
  onToggleItem: (itemId: string) => void
  onToggleAllVisible: () => void
}) {
  const allVisibleSelected =
    items.length > 0 && items.every((item) => selectedItemIds.includes(item.id))
  const someVisibleSelected = items.some((item) =>
    selectedItemIds.includes(item.id)
  )

  if (items.length === 0) {
    return (
      <div className="mt-0 flex min-h-0 flex-1 flex-col">
        <KnowledgeBaseEmptyState />
      </div>
    )
  }

  return (
    <div className="mt-0 flex min-h-0 flex-1 flex-col">
      <div className="relative">
        <div
          role="presentation"
          className="group/kb-header relative grid h-[42px] grid-cols-[minmax(0,1fr)_36px] items-center gap-4 overflow-visible py-3 pe-2 text-[14px] leading-[18px] text-muted-foreground sm:grid-cols-[minmax(0,1fr)_minmax(0,160px)_minmax(0,88px)_64px]"
        >
          <div
            className={cn(
              'pointer-events-none absolute -start-8 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center opacity-0 transition-opacity group-hover/kb-header:pointer-events-auto group-hover/kb-header:opacity-100',
              someVisibleSelected && 'pointer-events-auto opacity-100'
            )}
          >
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className="absolute start-0 top-0 m-0 h-full w-10 appearance-none border-0 bg-transparent p-0"
              onClick={onToggleAllVisible}
            />
            <SelectionCheckbox
              label="选择全部"
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected && !allVisibleSelected}
              onToggle={onToggleAllVisible}
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-1 ps-4 text-start outline-none"
          >
            名称
          </button>
          <button
            type="button"
            aria-pressed="true"
            className="hidden w-full items-center justify-start gap-1 text-start outline-none sm:flex"
          >
            已修改
            <ArrowDown className="size-[14px] text-muted-foreground" />
          </button>
          <button
            type="button"
            className="hidden w-full items-center justify-start gap-1 text-start outline-none sm:flex sm:ps-4"
          >
            大小
          </button>
        </div>

        <div role="grid" className="flex flex-col">
            {items.map((item) => {
              const { Icon } = item
              const isSelected = selectedItemIds.includes(item.id)

              return (
                <div
                  key={item.id}
                  role="row"
                  tabIndex={0}
                  aria-selected={isSelected}
                  data-selected={isSelected ? 'true' : undefined}
                  className={cn(
                    'group/kb-row relative grid min-h-14 cursor-pointer grid-cols-[minmax(0,1fr)_36px] items-center gap-4 border-t border-zinc-200/80 py-2 pe-2 transition-colors first:border-t-0 hover:rounded-xl hover:border-transparent hover:bg-muted/50 hover:[&+div]:border-t-transparent sm:grid-cols-[minmax(0,1fr)_minmax(0,160px)_minmax(0,88px)_64px]',
                    isSelected &&
                      'rounded-xl border-transparent bg-muted/70 hover:bg-muted/70 [&+div]:border-t-transparent'
                  )}
                  onClick={() => onToggleItem(item.id)}
                >
                  <div
                    role="gridcell"
                    className={cn(
                      'pointer-events-none absolute -start-8 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center opacity-0 transition-opacity group-hover/kb-row:pointer-events-auto group-hover/kb-row:opacity-100',
                      someVisibleSelected && 'pointer-events-auto opacity-100'
                    )}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      className="absolute start-0 top-0 m-0 h-full w-10 appearance-none border-0 bg-transparent p-0"
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleItem(item.id)
                      }}
                    />
                    <SelectionCheckbox
                      label={`选择“${item.fileName}”`}
                      checked={isSelected}
                      onToggle={() => onToggleItem(item.id)}
                    />
                  </div>
                  <div
                    role="gridcell"
                    className="relative z-10 flex min-w-0 items-center gap-3 ps-4 text-start outline-none"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-zinc-200 bg-background">
                      <Icon className={cn('size-5', item.iconColor)} />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          className="block w-full min-w-0 truncate border-0 bg-transparent p-0 text-start text-[14px] leading-[18px] text-foreground"
                        >
                          {item.fileName}
                        </button>
                      </div>
                      <div className="mt-1 truncate text-[12px] leading-[16px] text-muted-foreground sm:hidden">
                        {item.formattedModifiedAt}
                      </div>
                    </div>
                  </div>

                  <div
                    role="gridcell"
                    className="relative z-10 hidden truncate text-start text-[14px] leading-[18px] text-muted-foreground sm:block"
                  >
                    {item.formattedModifiedAt}
                  </div>
                  <div
                    role="gridcell"
                    className="relative z-10 hidden truncate text-start text-[14px] leading-[18px] text-muted-foreground sm:block sm:ps-4"
                  >
                    {item.sizeLabel}
                  </div>
                  <div
                    role="gridcell"
                    className={cn(
                      'flex items-center justify-end gap-2 opacity-100 sm:transition-opacity',
                      isSelected
                        ? 'pointer-events-none invisible sm:opacity-0'
                        : 'sm:opacity-0 sm:group-hover/kb-row:opacity-100'
                    )}
                    aria-hidden={isSelected}
                  >
                    <KnowledgeBaseItemMenu
                      itemId={item.id}
                      fileName={item.fileName}
                    />
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
