import { useMemo, useState } from 'react'
import { KnowledgeBaseGrid } from '@/features/knowledge/KnowledgeBaseGrid'
import { KnowledgeBaseHeader } from '@/features/knowledge/KnowledgeBaseHeader'
import { KnowledgeBaseList } from '@/features/knowledge/KnowledgeBaseList'
import {
  KnowledgeBaseToolbar,
  type KnowledgeBaseFilter,
  type KnowledgeBaseSourceFilter,
  type KnowledgeBaseTypeFilter,
  type KnowledgeBaseView,
} from '@/features/knowledge/KnowledgeBaseToolbar'
import { getKnowledgeBaseItems } from '@/features/knowledge/getKnowledgeBaseItems'

export function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<KnowledgeBaseFilter>('file')
  const [sourceFilter, setSourceFilter] =
    useState<KnowledgeBaseSourceFilter>(null)
  const [typeFilter, setTypeFilter] = useState<KnowledgeBaseTypeFilter>(null)
  const [view, setView] = useState<KnowledgeBaseView>('list')
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

  const items = useMemo(() => getKnowledgeBaseItems(), [])
  const visibleItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return items.filter((item) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'image' && item.category === 'image') ||
        (filter === 'file' && item.category !== 'image')
      const matchesSource =
        sourceFilter === null || item.source === sourceFilter
      const matchesType =
        typeFilter === null ||
        (typeFilter === 'document' && item.category === 'word') ||
        (typeFilter === 'image' && item.category === 'image') ||
        (typeFilter === 'spreadsheet' && item.category === 'spreadsheet') ||
        (typeFilter === 'presentation' && item.category === 'powerpoint') ||
        (typeFilter === 'media' &&
          (item.category === 'video' || item.category === 'audio')) ||
        (typeFilter === 'pdf' && item.category === 'pdf')
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.fileName.toLowerCase().includes(normalizedSearch)

      return matchesFilter && matchesSource && matchesType && matchesSearch
    })
  }, [filter, items, searchTerm, sourceFilter, typeFilter])
  const visibleItemIds = useMemo(
    () => visibleItems.map((item) => item.id),
    [visibleItems]
  )
  const selectedVisibleCount = selectedItemIds.filter((id) =>
    visibleItemIds.includes(id)
  ).length

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    )
  }

  const handleToggleAllVisible = () => {
    setSelectedItemIds((current) => {
      const visibleIdSet = new Set(visibleItemIds)
      const allVisibleSelected =
        visibleItemIds.length > 0 &&
        visibleItemIds.every((id) => current.includes(id))

      if (allVisibleSelected) {
        return current.filter((id) => !visibleIdSet.has(id))
      }

      return Array.from(new Set([...current, ...visibleItemIds]))
    })
  }

  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      <main className="min-h-full">
        <div className="mx-auto flex w-full max-w-[810px] flex-col px-4 pt-10 pb-0">
          <KnowledgeBaseHeader
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
          />
        </div>

        <div className="sticky top-0 z-20 mt-5 bg-zinc-50">
          <div className="mx-auto flex w-full max-w-[810px] px-4">
            <KnowledgeBaseToolbar
              filter={filter}
              onFilterChange={setFilter}
              sourceFilter={sourceFilter}
              onSourceFilterChange={setSourceFilter}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              view={view}
              onViewChange={setView}
              selectedCount={selectedVisibleCount}
            />
          </div>
        </div>

        <div className="mx-auto flex h-full w-full max-w-[810px] flex-col px-4 pb-8">
          {view === 'grid' ? (
            <KnowledgeBaseGrid
              items={visibleItems}
              selectedItemIds={selectedItemIds}
              onToggleItem={handleToggleItem}
            />
          ) : (
            <KnowledgeBaseList
              items={visibleItems}
              selectedItemIds={selectedItemIds}
              onToggleItem={handleToggleItem}
              onToggleAllVisible={handleToggleAllVisible}
            />
          )}
        </div>
      </main>
    </div>
  )
}
