import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Globe2, Plus, Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ConnectPage } from './types'

// 左上角的页面切换器。设计稿：「点击 Connect 时展示下拉选择，默认是 Public Hall，
// 可以自主创建…UCLA 数学兴趣小组…2026 级 13 班」，且「选中时有变色效果」。
//
// 它只是画面 —— 切换改的是本页内容区，不接管 AppLayout 的真导航。

// 这里不能用 UserAvatar：它渲染的是 <button>，而本组件的触发器和每一行本身
// 就是 <button>，套进去会得到非法的 button 嵌套。所以单独画一个纯展示的色块。
function Swatch({ name, color, size }: { name: string; color: string; size: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size / 2,
        lineHeight: 1,
        color: 'rgba(255,255,255,0.9)',
      }}
    >
      {name[0]?.toUpperCase()}
    </span>
  )
}

interface ConnectPageSwitcherProps {
  pages: ConnectPage[]
  currentPageId: string
  onSelect: (pageId: string) => void
}

function PageRow({
  page,
  selected,
  onSelect,
}: {
  page: ConnectPage
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
        selected ? 'bg-amber-50' : 'hover:bg-zinc-100'
      )}
    >
      <Swatch name={page.name} color={page.color} size={28} />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm',
            selected ? 'font-semibold text-amber-700' : 'font-medium text-zinc-800'
          )}
        >
          {page.name}
        </span>
        <span className="block truncate text-xs text-zinc-500">{page.subtitle}</span>
      </span>
      {selected && <Check className="size-4 shrink-0 text-amber-600" />}
    </button>
  )
}

export function ConnectPageSwitcher({ pages, currentPageId, onSelect }: ConnectPageSwitcherProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = pages.find((page) => page.id === currentPageId) ?? pages[0]
  const publicPages = pages.filter((page) => !page.ownedByMe)
  const myPages = pages.filter((page) => page.ownedByMe)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-colors',
          open ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-white hover:bg-zinc-50'
        )}
      >
        <Swatch name={current.name} color={current.color} size={24} />
        <span className="max-w-[220px] truncate text-sm font-semibold text-zinc-900">{current.name}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-zinc-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="关闭页面切换"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            className="absolute top-full left-0 z-50 mt-2 w-[300px] rounded-xl border border-zinc-200 bg-white p-2 shadow-lg"
          >
            <p className="flex items-center gap-1.5 px-2 pt-1 pb-2 text-xs font-medium text-zinc-400">
              <Globe2 className="size-3.5" />
              公共
            </p>
            {publicPages.map((page) => (
              <PageRow
                key={page.id}
                page={page}
                selected={page.id === currentPageId}
                onSelect={() => {
                  onSelect(page.id)
                  setOpen(false)
                }}
              />
            ))}

            <p className="flex items-center gap-1.5 px-2 pt-3 pb-2 text-xs font-medium text-zinc-400">
              <Users className="size-3.5" />
              我创建的
            </p>
            {myPages.map((page) => (
              <PageRow
                key={page.id}
                page={page}
                selected={page.id === currentPageId}
                onSelect={() => {
                  onSelect(page.id)
                  setOpen(false)
                }}
              />
            ))}

            <div className="mt-2 border-t border-zinc-100 pt-2">
              <button
                type="button"
                disabled
                title="原型阶段未接：设计稿要求「可以自主创建」"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-zinc-400"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-300">
                  <Plus className="size-3.5" />
                </span>
                <span className="flex-1">创建空间</span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-400">未接</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
