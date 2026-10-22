import { useState } from 'react'
import { FileText, GripHorizontal, StickyNote } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { CanvasElement } from './canvasData'
import { NOTE_MAX_CHARS } from './canvasData'
import { EigenExplorer } from '@/features/focus-activity/EigenExplorer'
/**
 * 三类元素的卡片 —— **形态即分类**。
 *
 * 不靠角标或颜色点区分，靠**卡片本身就是另一种东西**：
 * file 是一张文件卡（白底、图标、类型行），note 是一张便签（暖黄底、字即内容），
 * interactive 是一台小仪器（赭色顶条 + 内嵌实验）。
 * 远看轮廓就不同 —— 这一条比任何图例都有效。
 *
 * 拖动起手也按类分：file 全卡可拖；note / interactive **只认头部条**。
 * 不是限制，是必需：它们的卡身分别是输入框和滑杆，节点根上的 pointerdown
 * 会把任何触摸变成拖动起点，字就打不进去、杆就拖不动了。
 */
export function CanvasElementCard({
  element,
  selected,
  dragging,
  onHandlePointerDown,
  onSelect,
  onOpenFile,
  onTextChange,
}: {
  element: CanvasElement
  selected: boolean
  dragging: boolean
  onHandlePointerDown: (event: React.PointerEvent<HTMLElement>) => void
  onSelect: () => void
  onOpenFile: () => void
  onTextChange: (text: string) => void
}) {
  const shell = cn(
    'rounded-lg shadow-sm transition-shadow',
    selected ? 'ring-2' : 'ring-1 ring-zinc-200/80',
    selected && 'ring-[#8A5A2B]',
    dragging && 'shadow-md'
  )

  if (element.class === 'file') {
    return (
      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={onOpenFile}
        onPointerDown={onHandlePointerDown}
        aria-label={`文件：${element.title}（双击进入聚焦）`}
        className={cn(
          shell,
          'block w-52 cursor-pointer bg-white px-3 py-2.5 text-left',
          !dragging && 'hover:shadow-md'
        )}
      >
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 size-4 shrink-0 text-zinc-400" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium leading-5 text-zinc-800">
              {element.title}
            </p>
            <p className="text-[11px] leading-4 text-zinc-400">{element.meta}</p>
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-400">双击进入聚焦</p>
      </button>
    )
  }

  if (element.class === 'note') {
    return (
      <NoteCard
        element={element}
        selected={selected}
        dragging={dragging}
        onHandlePointerDown={onHandlePointerDown}
        onSelect={onSelect}
        onTextChange={onTextChange}
      />
    )
  }

  return (
    <InteractiveCard
      element={element}
      selected={selected}
      dragging={dragging}
      onHandlePointerDown={onHandlePointerDown}
    />
  )
}

/* ── note ─────────────────────────────────────────────────────────────── */

function NoteCard({
  element,
  selected,
  dragging,
  onHandlePointerDown,
  onSelect,
  onTextChange,
}: {
  element: CanvasElement
  selected: boolean
  dragging: boolean
  onHandlePointerDown: (event: React.PointerEvent<HTMLElement>) => void
  onSelect: () => void
  onTextChange: (text: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const text = element.text ?? ''
  const full = text.length >= NOTE_MAX_CHARS

  return (
    <div
      className={cn(shellClasses(selected, dragging), 'w-56 bg-[#FBF6E9]')}
      aria-label={`便签：${element.title}`}
    >
      {/* 头部条：唯一能拖动这它起手的地方。卡身是输入框，不能被 pointerdown 抢。 */}
      <div
        onPointerDown={onHandlePointerDown}
        className={cn(
          'flex cursor-grab items-center gap-1.5 px-2.5 pt-2',
          dragging && 'cursor-grabbing'
        )}
      >
        <StickyNote className="size-3 text-[#B98A3C]" />
        <span className="text-[10px] tracking-[0.06em] text-[#B98A3C]">便签</span>
        <GripHorizontal className="ml-auto size-3 text-[#D9C79E]" />
      </div>

      {editing ? (
        <div className="px-2.5 pb-2">
          <textarea
            value={text}
            maxLength={NOTE_MAX_CHARS}
            onChange={(event) => onTextChange(event.target.value)}
            onBlur={() => setEditing(false)}
            rows={3}
            aria-label="便签正文"
            className="w-full resize-none bg-transparent text-[13px] leading-5 text-zinc-800 outline-none"
          />
          <p className={cn('text-right text-[10px]', full ? 'text-[#B98A3C]' : 'text-zinc-400')}>
            {text.length}/{NOTE_MAX_CHARS}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={() => setEditing(true)}
          className="block w-full px-2.5 pb-2.5 pt-1 text-left"
        >
          <p className="whitespace-pre-wrap text-[13px] leading-5 text-zinc-800">
            {text || '空便签 —— 双击写点什么'}
          </p>
        </button>
      )}
    </div>
  )
}

/* ── interactive ──────────────────────────────────────────────────────── */

function InteractiveCard({
  element,
  selected,
  dragging,
  onHandlePointerDown,
}: {
  element: CanvasElement
  selected: boolean
  dragging: boolean
  onHandlePointerDown: (event: React.PointerEvent<HTMLElement>) => void
}) {
  return (
    <div
      className={cn(shellClasses(selected, dragging), 'w-80 bg-white')}
      aria-label={`交互元素：${element.title}`}
    >
      {/* 赭色顶条：interactive 的"这台东西能玩"信号，也是它唯一的拖动起手。 */}
      <div
        onPointerDown={onHandlePointerDown}
        className={cn(
          'flex h-6 cursor-grab items-center gap-1.5 rounded-t-lg bg-[#8A5A2B] px-2.5',
          dragging && 'cursor-grabbing'
        )}
      >
        <GripHorizontal className="size-3 text-white/60" />
        <span className="truncate text-[10px] text-white/90">{element.title}</span>
      </div>
      {/* EigenExplorer 原样复用（SVG 自适应宽度）。它内部的滑杆、判分文案都是真的 ——
          交互元素里不放假的，否则三类里就有一个是装饰。 */}
      <div className="px-2 pb-1 pt-1">
        <EigenExplorer />
      </div>
    </div>
  )
}

function shellClasses(selected: boolean, dragging: boolean) {
  return cn(
    'rounded-lg shadow-sm transition-shadow',
    selected ? 'ring-2 ring-[#8A5A2B]' : 'ring-1 ring-zinc-200/80',
    dragging && 'shadow-md'
  )
}
