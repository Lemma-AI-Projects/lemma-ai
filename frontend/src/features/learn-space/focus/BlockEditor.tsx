import { useCallback, useLayoutEffect, useRef } from 'react'
import {
  ArrowDown,
  ArrowUp,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Plus,
  Trash2,
  Type as TypeIcon,
} from 'lucide-react'

import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from '@/components/ActionMenu'
import {
  appendBlock,
  insertAfterKey,
  insertItemAfter,
  isBlank,
  mergeBack,
  moveBy,
  removeBlock,
  setHeading,
  setType,
  splitAt,
  toggleListOrdered,
  updateText,
  type BlockType,
  type DraftBlock,
  type FocusRequest,
} from './blockOps'

export interface BlockEditorProps {
  blocks: DraftBlock[]
  /** 交回新草稿；`focus` 是这一次编辑之后光标该去哪（由组件自己落地）。 */
  onChange: (next: DraftBlock[], focus?: FocusRequest) => void
  readOnly?: boolean
  /** Cmd/Ctrl+S。没给就没有快捷键（预览页不需要）。 */
  onSaveShortcut?: () => void
  placeholder?: string
  /**
   * Mala 的圈选：当前被选中的块的 key。
   *
   * ⚠️ **受控，且刻意不写进 `blocks`** —— 选中不是文档内容。草稿会被整页重存
   * （`doc_service.save_page_blocks` 删掉再插），而圈选点一下就变、Esc 就没了；
   * 把它塞进草稿等于把"临时 UI 状态"当"用户写的内容"，还会污染保存与冲突比较。
   */
  selectedKeys?: ReadonlySet<string>
  /**
   * 切换某一块的选中。⚠️ **意图式，不是"这是新集合"** ——
   * 在同一个点击批次里连点三块（用户圈选时的正常速度），传集合会让第二次基于
   * 第一次之前的旧值，**前两块的选择被静默丢掉**。意图式让 React 的批处理累积
   * 它们，每一块都留得下。
   */
  onSelectionToggle?: (key: string) => void
  /** 清空圈选（Esc）。 */
  onSelectionClear?: () => void
  /**
   * 「回到出处」：临时高亮这一块。⚠️ **不是选中** —— 选中是"这被圈了"，
   * 高亮是"你看这儿"；两者必须能区分（一个盲用户靠听，需要知道"我在哪"和
   * "我圈了什么"是两件事）。
   *
   * 宿主负责计时（加了值、过一会儿撤掉），这里只负责画 —— 因为"亮多久"
   * 是产品决定，不是编辑器的事。
   */
  flashKey?: string | null
}

const HEADING_CLASS: Record<number, string> = {
  1: 'text-xl font-semibold leading-8',
  2: 'text-lg font-medium leading-7',
  3: 'text-base font-medium leading-7',
}

/**
 * 选中态的样式常量。⚠️ **必须集中在这里**（见 `.plans/mala-note/selected-block-language.md` §4）——
 * 散落在每个块里拼 class 的话，改一处漏四处，离屏断言也无从挂。
 *
 * 三条约定，一条不多：
 * - **左侧 4px 色条**（不铺整块底 —— 长块会变成一大片灰，文档的阅读节奏被打断）
 * - **文字加深**（`text-zinc-800` → `text-zinc-950`；仅此一项排版变化）
 * - **边框不动**（块本来就有边框，再套一层是双边框）
 */
const SELECTED_BAR_CLASS = 'absolute left-0 top-0 h-full w-1 rounded-full bg-foreground'
const SELECTED_TEXT_CLASS = 'text-zinc-950 dark:text-zinc-50'
/** hover 只是预告，不是选中 —— 所以只有一层极淡的底，没有色条。 */
const HOVER_BLOCK_CLASS = 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
/**
 * 「回到出处」的高亮。⚠️ 用 **ring 而不是色条** —— 色条已经被"选中"占了，
 * 两种意思共用一套视觉语言会让人分不清"我圈了它"和"我在看它"。
 * `transition-shadow` 常驻在块上，所以加 ring 和撤 ring 都有 200ms 过渡
 * （淡入淡出是计划里的验收项，而它是这么来的，不是靠 keyframes）。
 */
const FLASH_BLOCK_CLASS = 'ring-2 ring-zinc-300 dark:ring-zinc-600'

/**
 * 聚焦模式里的正文编辑器 —— **自研、零依赖，每个块就是一个 `<textarea>`**。
 *
 * 为什么不做 contentEditable、也不引 TipTap：仓库里**没有任何编辑器依赖**
 * （`package.json` 里 tiptap / slate / lexical / prosemirror 都没有），而正文的
 * 数据形状本身极其朴素 —— 六种块，每种一段纯文本（`services/doc_service.py` 的
 * `markdown_to_blocks` 写出来的就是这个形状，渲染端 `BlockView` 也这么读）。
 * 为"一段纯文本"引入一套富文本模型，换回来的是 caret、选区、IME、粘贴的四种
 * 新 bug；`textarea` 这些是浏览器给的，白拿。
 *
 * 也因此**这一版没有行内格式**（粗体/斜体/链接）—— 那不是"省了"，是数据里本来
 * 就没有 inline 结构，硬加等于自己发明一套 schema。
 *
 * 所有规则都在 `blockOps.ts`（纯函数、有单测）；这里只负责
 * 「把事件翻译成调用 → 把结果画出来 → 把光标放到该在的地方」。
 */
export function BlockEditor({
  blocks,
  onChange,
  readOnly = false,
  onSaveShortcut,
  placeholder = '写点什么…',
  selectedKeys,
  onSelectionToggle,
  onSelectionClear,
  flashKey,
}: BlockEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  /**
   * 下一次渲染之后光标该去哪。用 ref 不用 state：它**不是渲染的输入**（画出来
   * 的东西跟它无关），而且控制它的时机正好是"DOM 提交之后"，那正是 ref 与
   * layout effect 的分工。
   */
  const pendingFocusRef = useRef<FocusRequest | null>(null)

  /**
   * 圈选手势是 **⌘/Ctrl + 点击**，不是单击。
   *
   * ⚠️ 块本身是一个可编辑的 `textarea`，单击必须留给编辑 —— 那是这个编辑器
   * 存在的原因。修饰键是这个场景里唯一不与输入冲突的鼠标手势。
   *
   * ⚠️ 而"切换"是**意图**（`onSelectionToggle(key)`）而不是"这是新集合"：
   * 圈选时用户会连着点三四块，那些点击落在同一个批次里，React 只重渲染一次。
   * 若每次点击都基于 prop 里的旧集合算新集合，第二块就会把第一块的选择覆盖掉
   * —— 而且**没有任何报错**，只是 quietly 少了几块。
   */

  const emit = useCallback(
    (next: DraftBlock[], focus?: FocusRequest) => {
      if (focus) pendingFocusRef.current = focus
      onChange(next)
    },
    [onChange]
  )

  // 两件事都必须在浏览器画之前做完：把 textarea 撑到内容高度（否则会闪一下
  // 滚动条），以及把光标放回用户手所在的那一块。
  useLayoutEffect(() => {
    const root = containerRef.current
    if (!root) return
    root.querySelectorAll('textarea').forEach((node) => {
      const area = node as HTMLTextAreaElement
      area.style.height = 'auto'
      area.style.height = `${area.scrollHeight}px`
    })
    const pendingFocus = pendingFocusRef.current
    if (pendingFocus) {
      pendingFocusRef.current = null
      const selector = `[data-block-key="${pendingFocus.key}"] textarea[data-item-index="${
        pendingFocus.item ?? 0
      }"]`
      const target = root.querySelector<HTMLTextAreaElement>(selector)
      if (target) {
        target.focus()
        const at =
          pendingFocus.at === 'end'
            ? target.value.length
            : typeof pendingFocus.at === 'number'
              ? Math.min(pendingFocus.at, target.value.length)
              : target.value.length
        target.setSelectionRange(at, at)
      }
    }
  })

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    block: DraftBlock,
    itemIndex: number
  ) => {
    if (readOnly) return
    const field = event.currentTarget

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      onSaveShortcut?.()
      return
    }
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault()
      emit(moveBy(blocks, block.key, event.key === 'ArrowUp' ? -1 : 1).draft)
      return
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      // 代码块里回车就是换行 —— 那个类型的存在意义就是保留换行。
      if (block.type === 'code') return
      event.preventDefault()
      if (block.type === 'list') {
        emit(insertItemAfter(blocks, block.key, itemIndex).draft, {
          key: block.key,
          item: itemIndex + 1,
          at: 0,
        })
        return
      }
      const result = splitAt(blocks, block.key, field.selectionStart)
      emit(result.draft, result.focus)
      return
    }
    if (event.key === 'Backspace' && field.selectionStart === 0 && field.selectionEnd === 0) {
      const result = mergeBack(
        blocks,
        block.key,
        block.type === 'list' ? itemIndex : undefined
      )
      // 没变化就放行，让浏览器按它自己的规矩来（文档开头那一下退格不该被吞）。
      if (result.draft === blocks) return
      event.preventDefault()
      emit(result.draft, result.focus)
    }
  }

  const changeText = (block: DraftBlock, text: string, item?: number) => {
    onChange(updateText(blocks, block.key, text, item))
  }

  const fieldClass =
    'w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-zinc-300'

  return (
    <div
      ref={containerRef}
      className="space-y-1"
      onKeyDown={(event) => {
        // Esc 清空圈选。⚠️ 挂在容器上而不是每块上：圈了三块之后，焦点不一定在
        // 最后一块里，而"我现在想全取消"这个意图与焦点在哪无关。
        if (event.key !== 'Escape') return
        if (!selectedKeys || selectedKeys.size === 0) return
        event.preventDefault()
        onSelectionClear?.()
      }}
    >
      {blocks.map((block) => {
        const isSelected = selectedKeys?.has(block.key) ?? false
        const isFlashing = flashKey != null && flashKey === block.key
        return (
          <div
            key={block.key}
            data-block-key={block.key}
            data-selected={isSelected ? 'true' : undefined}
            data-flash={isFlashing ? 'true' : undefined}
            className={[
              'group relative rounded-md transition-shadow',
              isSelected ? '' : HOVER_BLOCK_CLASS,
              isFlashing ? FLASH_BLOCK_CLASS : '',
            ].join(' ')}
            onClick={(event) => {
              if (!onSelectionToggle) return
              if (!(event.metaKey || event.ctrlKey)) return
              event.preventDefault()
              onSelectionToggle(block.key)
            }}
          >
            {isSelected && <span className={SELECTED_BAR_CLASS} />}
          {!readOnly && (
            <div className="absolute -left-9 top-1 hidden items-center group-hover:flex group-focus-within:flex">
              <BlockMenu
                block={block}
                onSetType={(type) => {
                  const result = setType(blocks, block.key, type)
                  emit(result.draft, result.focus)
                }}
                onSetLevel={(level) => {
                  const result = setHeading(blocks, block.key, level)
                  emit(result.draft, result.focus)
                }}
                onToggleOrdered={() => emit(toggleListOrdered(blocks, block.key).draft)}
                onMove={(delta) => emit(moveBy(blocks, block.key, delta).draft)}
                onRemove={() => {
                  const result = removeBlock(blocks, block.key)
                  emit(result.draft, result.focus)
                }}
              />
            </div>
          )}

          {block.type === 'divider' ? (
            <div className="flex items-center gap-2 py-2">
              <hr className="flex-1 border-zinc-200 dark:border-zinc-800" />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    const result = insertAfterKey(blocks, block.key, 'paragraph')
                    emit(result.draft, result.focus)
                  }}
                  className="rounded p-1 text-zinc-400 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100"
                  aria-label="在下面加一段"
                >
                  <Plus className="size-3.5" />
                </button>
              )}
            </div>
          ) : block.type === 'list' ? (
            <ListBlock
              block={block}
              readOnly={readOnly}
              className={
                isSelected ? `${fieldClass} ${SELECTED_TEXT_CLASS}` : fieldClass
              }
              onKeyDown={handleKeyDown}
              onChangeText={changeText}
            />
          ) : (
            <textarea
              data-item-index={0}
              rows={1}
              readOnly={readOnly}
              spellCheck={false}
              value={block.content.text ?? ''}
              placeholder={
                block.type === 'heading' ? '标题' : isBlank(block) ? placeholder : undefined
              }
              onKeyDown={(event) => handleKeyDown(event, block, 0)}
              onChange={(event) => changeText(block, event.target.value)}
              className={[
                fieldClass,
                block.type === 'heading'
                  ? `${HEADING_CLASS[Math.min(Math.max(block.content.level ?? 2, 1), 3)] ?? HEADING_CLASS[3]} pt-2 font-medium`
                  : block.type === 'quote'
                    ? 'border-l-2 border-zinc-300 py-1 pl-3 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'
                    : block.type === 'code'
                      ? 'rounded-lg bg-zinc-100 p-3 font-mono text-xs leading-5 dark:bg-zinc-900'
                      : 'text-sm leading-6 text-zinc-800 dark:text-zinc-100',
                // 选中只改文字浓度，不改字号/行高/对齐 —— 选中是标记，不是重排。
                isSelected ? SELECTED_TEXT_CLASS : '',
              ].join(' ')}
            />
          )}
        </div>
        )
      })}

      {!readOnly && blocks.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              const result = appendBlock(blocks, 'paragraph')
              emit(result.draft, result.focus)
            }}
            className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <Plus className="size-3.5" />
            新段落
          </button>
        </div>
      )}
    </div>
  )
}

function ListBlock({
  block,
  readOnly,
  className,
  onKeyDown,
  onChangeText,
}: {
  block: DraftBlock
  readOnly: boolean
  className: string
  onKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    block: DraftBlock,
    itemIndex: number
  ) => void
  onChangeText: (block: DraftBlock, text: string, item?: number) => void
}) {
  const items = block.content.items ?? ['']
  return (
    <div className="flex flex-col gap-1 text-sm leading-6">
      {items.map((item, itemIndex) => (
        <div key={itemIndex} className="flex items-start gap-2">
          <span className="mt-[3px] w-4 shrink-0 select-none text-right text-zinc-400">
            {block.content.ordered ? `${itemIndex + 1}.` : '·'}
          </span>
          <textarea
            data-item-index={itemIndex}
            rows={1}
            readOnly={readOnly}
            spellCheck={false}
            value={item}
            placeholder={items.length === 1 ? '列表项' : undefined}
            onKeyDown={(event) => onKeyDown(event, block, itemIndex)}
            onChange={(event) => onChangeText(block, event.target.value, itemIndex)}
            className={className}
          />
        </div>
      ))}
    </div>
  )
}

function BlockMenu({
  block,
  onSetType,
  onSetLevel,
  onRemove,
  onMove,
  onToggleOrdered,
}: {
  block: DraftBlock
  onSetType: (type: BlockType) => void
  onSetLevel: (level: number) => void
  onRemove: () => void
  onMove: (delta: number) => void
  onToggleOrdered: () => void
}) {
  const isList = block.type === 'list'
  return (
    <ActionMenu
      align="start"
      width="md"
      trigger={
        <button
          type="button"
          aria-label="这一段的类型"
          className="rounded p-1 text-zinc-300 transition hover:bg-zinc-100 hover:text-zinc-600"
        >
          <TypeIcon className="size-3.5" />
        </button>
      }
    >
      <ActionMenuItem icon={Pilcrow} label="正文" onSelect={() => onSetType('paragraph')} />
      <ActionMenuItem icon={Heading1} label="标题 1" onSelect={() => onSetLevel(1)} />
      <ActionMenuItem icon={Heading2} label="标题 2" onSelect={() => onSetLevel(2)} />
      <ActionMenuItem icon={Heading3} label="标题 3" onSelect={() => onSetLevel(3)} />
      <ActionMenuSeparator />
      <ActionMenuItem
        icon={List}
        label="列表"
        onSelect={() => (isList ? onToggleOrdered() : onSetType('list'))}
      />
      <ActionMenuItem icon={ListOrdered} label="有序 / 无序" onSelect={onToggleOrdered} />
      <ActionMenuItem icon={Quote} label="引用" onSelect={() => onSetType('quote')} />
      <ActionMenuItem icon={Code2} label="代码" onSelect={() => onSetType('code')} />
      <ActionMenuItem icon={Minus} label="分割线" onSelect={() => onSetType('divider')} />
      <ActionMenuSeparator />
      <ActionMenuItem icon={ArrowUp} label="上移" onSelect={() => onMove(-1)} />
      <ActionMenuItem icon={ArrowDown} label="下移" onSelect={() => onMove(1)} />
      <ActionMenuSeparator />
      <ActionMenuItem icon={Trash2} label="删除这一段" destructive onSelect={onRemove} />
    </ActionMenu>
  )
}
