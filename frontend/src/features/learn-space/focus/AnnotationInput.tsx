import { useLayoutEffect, useRef, useState } from 'react'

/**
 * 边注的临时输入框 —— **一个控件，不是一套**。
 *
 * 设计约束来自 `.plans/focus-mvp/annotation-rail-language.md`（draft）：
 * - **一条底线**，不是带边框的输入框：它是瞬态的，重了会抢正文；
 * - **失焦不消失**：用户可能翻一眼左栏大纲再回来，框该还在；
 * - **只有两条路出去**：`回车`（写了）和 `Esc`（不写）。没有"取消"按钮；
 * - **位置贴在那一块的下方**：不是选区的正下方 —— textarea 的内部选区
 *   拿不到 rect（浏览器不给 form control 的选区矩形），要拿得到得用镜像 div
 *   那套 hack，而那是用六十行代码换几像素的精度。
 *
 * ⚠️ 它**不自己存任何东西**：`onSubmit` 由宿主决定那句话落到哪儿。
 *
 * ⚠️ placeholder 用 `zinc-400` 而不是 `zinc-300`：失焦时这整个东西只剩一条线
 * 和四个灰字，300 在浅底上几乎看不见 —— 用户会把它当成一条分隔线。
 * 400 与产品的 `--muted-foreground` 同档。
 */

export function AnnotationInput({
  blockKey,
  onSubmit,
  onCancel,
}: {
  /** 定位用：输入框贴在这一块的下方。 */
  blockKey: string
  onSubmit: (text: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState('')
  const [top, setTop] = useState<number | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /**
   * 位置：块相对**滚动容器**的偏移。
   *
   * ⚠️ 滚动容器是**从 DOM 上找的**（`[data-focus-scroller]`），不是自己的 ref ——
   * 把自己这个 `absolute` 的壳当参照是循环依赖：壳的位置由 `top` 决定，
   * 而 `top` 又要用壳的位置算出来。第一版就是这么写的，结果框偏了 909px。
   *
   * ⚠️ 两条纪律沿用别处：遍历 + 属性比较（不把 key 拼进选择器），
   * 以及 `getBoundingClientRect + scrollTop` 而不是 `offsetTop`（后者依赖
   * offsetParent 链，而那一链上每一层都可能是 relative，错得很安静）。
   */
  useLayoutEffect(() => {
    const place = () => {
      const block = [...document.querySelectorAll('[data-block-key]')].find(
        (el) => el.getAttribute('data-block-key') === blockKey
      )
      const host = block?.closest('[data-focus-scroller]') as HTMLElement | null
      if (!block || !host) return
      const hostBox = host.getBoundingClientRect()
      const blockBox = block.getBoundingClientRect()
      setTop(blockBox.bottom - hostBox.top + host.scrollTop)
    }
    place()
    // 打开时用户可能正在滚动，或者窗口被缩放 —— 两者都让位置失效。
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [blockKey])

  useLayoutEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="absolute inset-x-0 z-10 px-8" style={{ top: top ?? undefined }}>
      <div className="mx-auto max-w-2xl">
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          placeholder="记一句…"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              if (value.trim()) onSubmit(value.trim())
              return
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              onCancel()
            }
          }}
          className="w-full resize-none overflow-hidden border-b border-zinc-300 bg-transparent px-1 py-1 text-[13px] leading-6 text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 dark:text-zinc-100 dark:border-zinc-600"
        />
      </div>
    </div>
  )
}
