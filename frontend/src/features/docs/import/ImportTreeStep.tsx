import { useMemo, useState } from 'react'
import { ChevronRight, FileText, Folder, Search, X } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { useAppTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import {
  checkState,
  collectIds,
  countFiles,
  countSelection,
  expandSelection,
  filterTree,
  treeIds,
} from './treeUtils'
import type { ImportTreeNode } from './types'

export interface ImportTreeStepProps {
  tree: ImportTreeNode[]
  selected: ReadonlySet<string>
  onSelectedChange: (next: Set<string>) => void
}

/**
 * 第 2 步：勾选要导入的子集 —— 整条流程真正的难点在这里。
 *
 * 四条规则：
 * 1. 勾文件夹连带全部子孙；只勾中一部分时文件夹显示**半选**（否则「里面选了一部分」
 *    这件事在界面上就丢了）。
 * 2. 行本身可点（16px 的勾选框不该是全屏最难点中的东西），箭头单独 stopPropagation。
 * 3. 搜索命中自身就保留整棵子树（用户找的正是这个文件夹，应该能接着往里挑），
 *    只在子孙里命中则保留路径骨架；搜索时强制展开，否则结果藏在下钻里看不见。
 * 4. 「全选 / 取消全选」只作用于**当前列出的**节点 —— 不搜索时等于全部，
 *    搜索时就等于「把找到的都选上」，比一个作用域说不清的全局按钮可预期。
 */
export function ImportTreeStep({
  tree,
  selected,
  onSelectedChange,
}: ImportTreeStepProps) {
  const { t } = useAppTranslation()
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(tree.filter((node) => node.children?.length).map((node) => node.id))
  )

  const filtered = useMemo(() => filterTree(tree, query), [tree, query])
  const isSearching = query.trim().length > 0
  // 搜索时全展开：命中项可能在任何深度，不展开等于没搜到。
  const effectiveExpanded = useMemo(
    () => (isSearching ? new Set(treeIds(filtered)) : expanded),
    [isSearching, filtered, expanded]
  )

  const visibleIds = useMemo(() => collectIds(filtered), [filtered])
  const counts = useMemo(() => countSelection(selected, tree), [selected, tree])

  const toggleExpand = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleToggleCheck = (node: ImportTreeNode, on: boolean) =>
    onSelectedChange(expandSelection(selected, node, on))

  const handleSelectVisible = () =>
    onSelectedChange(new Set([...selected, ...visibleIds]))

  const handleClearVisible = () => {
    const next = new Set(selected)
    for (const id of visibleIds) next.delete(id)
    onSelectedChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('import.contentSearch')}
            aria-label={t('import.contentSearch')}
            className="h-8 w-full rounded-lg border border-zinc-200 bg-background pr-7 pl-8 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:border-zinc-300"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t('import.contentClearSearch')}
              className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleSelectVisible}
          disabled={visibleIds.length === 0}
          className="h-8 shrink-0 rounded-lg border border-zinc-200 px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-default disabled:text-zinc-300 disabled:hover:bg-transparent"
        >
          {t('import.contentSelectAll')}
        </button>
        <button
          type="button"
          onClick={handleClearVisible}
          disabled={visibleIds.length === 0}
          className="h-8 shrink-0 rounded-lg border border-zinc-200 px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-default disabled:text-zinc-300 disabled:hover:bg-transparent"
        >
          {t('import.contentClearAll')}
        </button>
      </div>

      <div className="scrollbar-fade max-h-[19rem] min-h-[15rem] overflow-y-auto rounded-lg border border-zinc-200 p-1">
        {filtered.length === 0 ? (
          <div className="flex h-full min-h-[14rem] items-center justify-center">
            <p className="text-[13px] text-zinc-400">{t('import.contentEmpty')}</p>
          </div>
        ) : (
          <ul role="tree" aria-label={t('import.contentTitle')} className="space-y-0.5">
            {filtered.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                depth={0}
                selected={selected}
                expanded={effectiveExpanded}
                onToggleExpand={toggleExpand}
                onToggleCheck={handleToggleCheck}
              />
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        {t('import.contentSelected', {
          files: counts.files,
          folders: counts.folders,
        })}
      </p>
    </div>
  )
}

interface TreeRowProps {
  node: ImportTreeNode
  depth: number
  selected: ReadonlySet<string>
  expanded: ReadonlySet<string>
  onToggleExpand: (id: string) => void
  onToggleCheck: (node: ImportTreeNode, on: boolean) => void
}

function TreeRow({
  node,
  depth,
  selected,
  expanded,
  onToggleExpand,
  onToggleCheck,
}: TreeRowProps) {
  const { t } = useAppTranslation()
  const state = checkState(selected, node)
  const hasChildren = Boolean(node.children?.length)
  const isExpanded = expanded.has(node.id)
  const isFolder = node.kind === 'folder'

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
      <div
        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md pr-2 transition-colors hover:bg-muted"
        style={{ paddingLeft: depth * 14 + 4 }}
        onClick={() => onToggleCheck(node, state !== 'checked')}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={
              isExpanded
                ? t('import.contentCollapse')
                : t('import.contentExpand')
            }
            onClick={(event) => {
              event.stopPropagation()
              onToggleExpand(node.id)
            }}
            className="flex size-4 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:outline-none"
          >
            <ChevronRight
              className={cn(
                'size-3.5 transition-transform duration-150 ease-out',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
        ) : (
          <span className="size-4 shrink-0" aria-hidden />
        )}

        <Checkbox
          // Radix 的 CheckedState 只有 `boolean | 'indeterminate'`，
          // 没有 'checked' 这个字面量 —— 三态要翻译成它的两种写法。
          checked={state === 'indeterminate' ? 'indeterminate' : state === 'checked'}
          onCheckedChange={(next) => onToggleCheck(node, next === true)}
          onClick={(event) => event.stopPropagation()}
          aria-label={node.name}
        />

        {isFolder ? (
          <Folder className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
        ) : (
          <FileText className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
        )}

        <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-800">
          {node.name}
        </span>

        {isFolder && hasChildren && (
          <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
            {countFiles(node.children as ImportTreeNode[])}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <ul role="group" className="space-y-0.5">
          {node.children?.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selected={selected}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onToggleCheck={onToggleCheck}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
