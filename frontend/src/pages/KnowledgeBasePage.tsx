import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { KnowledgeBaseGrid } from '@/features/knowledge/KnowledgeBaseGrid'
import { KnowledgeBaseHeader } from '@/features/knowledge/KnowledgeBaseHeader'
import { KnowledgeBaseFolderBar } from '@/features/knowledge/KnowledgeBaseFolderBar'
import { KnowledgeBaseList } from '@/features/knowledge/KnowledgeBaseList'
import { KnowledgeBaseDetailDialog } from '@/features/knowledge/KnowledgeBaseDetailDialog'
import {
  KnowledgeBaseToolbar,
  type KnowledgeBaseFilter,
  type KnowledgeBaseSourceFilter,
  type KnowledgeBaseTypeFilter,
  type KnowledgeBaseView,
} from '@/features/knowledge/KnowledgeBaseToolbar'
import {
  createUploadedKnowledgeItem,
  getKnowledgeBaseItems,
  triggerDownload,
  type KnowledgeBaseFolder,
  type KnowledgeBaseItem,
} from '@/features/knowledge/getKnowledgeBaseItems'

export function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<KnowledgeBaseFilter>('file')
  const [sourceFilter, setSourceFilter] =
    useState<KnowledgeBaseSourceFilter>(null)
  const [typeFilter, setTypeFilter] = useState<KnowledgeBaseTypeFilter>(null)
  const [view, setView] = useState<KnowledgeBaseView>('list')
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  // 文件夹分组（演示）：自建文件夹 + 始终存在的「默认」虚拟分组（folderId === null）
  const [folders, setFolders] = useState<KnowledgeBaseFolder[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  // 上传演示：列表项提升为本地状态（后端接通后改为从接口拉取）
  const [items, setItems] = useState<KnowledgeBaseItem[]>(() =>
    getKnowledgeBaseItems()
  )
  const [isDragging, setIsDragging] = useState(false)
  // 「查看」详情弹窗的当前项；null 表示关闭
  const [viewItem, setViewItem] = useState<KnowledgeBaseItem | null>(null)
  // 上传成功后的轻量反馈（「过程感」）：底部 toast，自动消失
  const [toast, setToast] = useState<{ id: number; title: string } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 追踪所有本地 object URL，卸载时统一回收，避免内存泄漏
  const previewUrlsRef = useRef<string[]>([])
  const dragDepthRef = useRef(0)
  useEffect(() => {
    const urls = previewUrlsRef.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

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
      // 文件夹筛选：null = 默认分组（未归组），否则按 folderId 精确匹配
      const matchesFolder =
        selectedFolderId === null
          ? item.folderId === null
          : item.folderId === selectedFolderId

      return (
        matchesFilter &&
        matchesSource &&
        matchesType &&
        matchesSearch &&
        matchesFolder
      )
    })
  }, [filter, items, searchTerm, selectedFolderId, sourceFilter, typeFilter])

  // 各分组的条目数（用于文件夹栏的计数徽标）
  const folderCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of items) {
      const key = item.folderId === null ? '__default__' : item.folderId
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [items])
  const visibleItemIds = useMemo(
    () => visibleItems.map((item) => item.id),
    [visibleItems]
  )
  const selectedVisibleCount = selectedItemIds.filter((id) =>
    visibleItemIds.includes(id)
  ).length

  const handleFiles = (files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return
    const newItems = list.map(createUploadedKnowledgeItem)
    newItems.forEach((item) => {
      if (item.previewUrl) previewUrlsRef.current.push(item.previewUrl)
    })
    setItems((prev) => [...newItems, ...prev])

    // 上传完成反馈：让操作「有回应」，而不是静默入列
    const title =
      newItems.length === 1
        ? `已添加「${newItems[0].displayName}」到资料库`
        : `已添加 ${newItems.length} 个文件到资料库`
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ id: Date.now(), title })
    toastTimerRef.current = setTimeout(() => setToast(null), 2600)
  }

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

  // —— 文件夹分组（演示，纯前端状态） ——
  const handleCreateFolder = (name: string) => {
    setFolders((prev) => [...prev, { id: crypto.randomUUID(), name }])
  }
  const handleRenameFolder = (id: string, name: string) => {
    setFolders((prev) =>
      prev.map((folder) => (folder.id === id ? { ...folder, name } : folder))
    )
  }
  const handleDeleteFolder = (id: string) => {
    // 删除文件夹时，其中的条目回落到「默认」分组，而不是被删除
    setFolders((prev) => prev.filter((folder) => folder.id !== id))
    setItems((prev) =>
      prev.map((item) =>
        item.folderId === id ? { ...item, folderId: null } : item
      )
    )
    setSelectedFolderId((current) => (current === id ? null : current))
  }
  const handleMoveItem = (itemId: string, folderId: string | null) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, folderId } : item
      )
    )
  }

  // 拖拽上传（演示）：复用 handleFiles，仅在拖入文件时显示遮罩
  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault()
    if (!event.dataTransfer.types.includes('Files')) return
    dragDepthRef.current += 1
    setIsDragging(true)
  }
  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setIsDragging(false)
    }
  }
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    dragDepthRef.current = 0
    setIsDragging(false)
    if (event.dataTransfer.files?.length) {
      handleFiles(event.dataTransfer.files)
    }
  }

  return (
    <div
      className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <main className="min-h-full">
        <div className="mx-auto flex w-full max-w-[810px] flex-col px-4 pt-10 pb-0">
          <KnowledgeBaseHeader
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onFilesSelected={handleFiles}
          />
          <div className="mt-5">
            <KnowledgeBaseFolderBar
              folders={folders}
              selectedFolderId={selectedFolderId}
              counts={folderCounts}
              onSelect={setSelectedFolderId}
              onCreate={handleCreateFolder}
              onRename={handleRenameFolder}
              onDelete={handleDeleteFolder}
            />
          </div>
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
              onViewItem={setViewItem}
              onDownloadItem={triggerDownload}
              folders={folders}
              onMoveItem={handleMoveItem}
              emptyTitle={
                selectedFolderId !== null ? '这个文件夹还是空的' : undefined
              }
            />
          ) : (
            <KnowledgeBaseList
              items={visibleItems}
              selectedItemIds={selectedItemIds}
              onToggleItem={handleToggleItem}
              onToggleAllVisible={handleToggleAllVisible}
              onViewItem={setViewItem}
              onDownloadItem={triggerDownload}
              folders={folders}
              onMoveItem={handleMoveItem}
              emptyTitle={
                selectedFolderId !== null ? '这个文件夹还是空的' : undefined
              }
            />
          )}
        </div>
      </main>

      {isDragging && (
        <div className="pointer-events-none absolute inset-3 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-zinc-400 bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <span className="text-[15px] font-medium text-foreground">
              松开以上传到资料库
            </span>
            <span className="text-[13px]">
              支持 GIF / 视频 / SVG 等动画文件
            </span>
          </div>
        </div>
      )}

      <KnowledgeBaseDetailDialog
        item={viewItem}
        open={viewItem !== null}
        onOpenChange={(open) => {
          if (!open) setViewItem(null)
        }}
      />

      {/* 上传成功反馈：底部居中 toast，2.6s 后自动消失（仅前端演示反馈，后端接通不影响语义） */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
          <div
            key={toast.id}
            className="animate-in fade-in-0 slide-in-from-bottom-2 flex items-center gap-2 rounded-full border border-zinc-200 bg-background/95 px-4 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm"
          >
            <CheckCircle2 className="size-4 text-emerald-500" strokeWidth={2.25} />
            <span>{toast.title}</span>
          </div>
        </div>
      )}
    </div>
  )
}
