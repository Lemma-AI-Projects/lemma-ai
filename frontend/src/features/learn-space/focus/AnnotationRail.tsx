import { useLayoutEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { type RailLayout } from './annotationOps'

export type { RailAnnotation, RailGroup, RailLayout } from './annotationOps'

/**
 * 边注轨 —— 正文旁边那一列「我读的时候记下的话」。
 *
 * 视觉约定全部来自 `.plans/focus-mvp/annotation-rail-language.md`：
 * - **A1** 中栏内右侧窄列（不建第四栏、不放下方）；
 * - **A2** 固定宽度（随内容会让正文宽度随边注数量跳动）；
 * - **A3 不画引线** —— 边注和它锚的那段**在同一高度**，水平对齐本身就是定位，
 *   再画一条线是同一信息说两遍；
 * - **A4** 裸文字 + 左侧 2px 细线 + `text-zinc-500`（比正文淡：旁注不该和正文抢注意力）；
 * - **A5** 锚在同一段的多条**纵向堆叠**（所以按块分组，一组共用一个 `top`）；
 * - **A6** 不显示时间/作者（单用户空间，时间是噪音）；
 * - **A7** 一条都没有时**什么都不渲染**。
 *
 * ⚠️ **零按钮。** 跳回出处是**点那一行**（鼠标点文本），不是控件：
 * 这里没有 `<button>`、没有 `role="button"`、没有 `tabIndex`。
 * 代价是键盘用户走不到它 —— 这是记在案的取舍（`INDEX.md` §0 的控件预算），
 * 不是遗漏。测试同时钉住"没有 button 标签"和"没有伪装成文本的 button 语义"，
 * 免得日后有人加个 `role` 就把这道闸门糊过去。
 */
export function AnnotationRail({
  layout,
  onJump,
  className,
}: {
  layout: RailLayout
  /** 点那一行 ⇒ 回到它锚的那一段（收块 key，调用方负责滚动 + 高亮）。 */
  onJump: (blockKey: string) => void
  className?: string
}) {
  const columnRef = useRef<HTMLDivElement>(null)
  /**
   * 每组边注相对本列的纵向偏移。
   *
   * ⚠️ 量的是**块的位置**，不是"第几块" —— 块高由内容决定，行高/换行都算在里面，
   * 用序号乘一个常数在长段落上会错开几十像素。判据是 §4 第 2 条：同一水平线，
   * 偏差 ≤ 4px。
   *
   * ⚠️ 参照物是本列（`getBoundingClientRect` 相减），不是 `offsetTop` ——
   * 后者依赖 offsetParent 链，那一链上每一层都可能是 relative，错得很安静。
   */
  const [tops, setTops] = useState<Record<string, number>>({})
  const placed = layout.placed

  useLayoutEffect(() => {
    const measure = () => {
      const column = columnRef.current
      if (!column) return
      const columnTop = column.getBoundingClientRect().top
      const next: Record<string, number> = {}
      for (const group of placed) {
        // ⚠️ **遍历 + 属性比较**，不把 key 拼进选择器字符串：块 key 是本地生成的，
        // 但拼进选择器意味着将来"key 里出现引号/空格"会变成一次静默的语法错误
        // （查不到 ⇒ 只是不对齐）。
        const block = [...document.querySelectorAll('[data-block-key]')].find(
          (el) => el.getAttribute('data-block-key') === group.blockKey
        )
        if (!block) continue
        next[group.blockKey] = Math.round(
          block.getBoundingClientRect().top - columnTop
        )
      }
      setTops(next)
    }
    measure()
    // 缩放会改行高 ⇒ 已经量好的位置全失效。滚动**不用**监听：本列在滚动容器
    // 内部，两者一起滚，相对位置不变。
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [placed])

  if (placed.length === 0 && layout.loose.length === 0) return null

  return (
    <div ref={columnRef} className={cn('relative', className)}>
      {placed.map((group) => (
        <div
          key={group.blockKey}
          /* ⚠️ `data-rail-for` 是**给验收用的钩子**：§4 第 2 条要求"边注与所锚段落
             同一水平线（偏差 ≤ 4px）"，而那只能在一个真的排版引擎里量。有了这个
             属性，量法就是 `[data-rail-for=KEY]` 的 top 减去 `[data-block-key=KEY]`
             的 top —— 与仓库里 `data-block-key` / `data-flash` / `data-selected` 同一个路数。 */
          data-rail-for={group.blockKey}
          className="absolute inset-x-0 space-y-2"
          style={tops[group.blockKey] === undefined ? undefined : { top: tops[group.blockKey] }}
        >
          {group.annotations.map((annotation) => (
            <RailRow
              key={annotation.key}
              text={annotation.text}
              onJump={() => onJump(group.blockKey)}
            />
          ))}
        </div>
      ))}

      {/* 原话已经不在这一页了。⚠️ **不猜位置** —— 猜出来的位置会把用户的话挂到
          一段他没说过的话旁边第一次归零：这里不假装它们还对得上，但也**不丢**。 */}
      {layout.loose.length > 0 && (
        <div data-rail-loose="true" className="absolute inset-x-0 bottom-0 space-y-2">
          {layout.loose.map((annotation) => (
            <RailRow key={annotation.key} text={annotation.text} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 一条边注。A4 的形状：**裸文字 + 左侧 2px 细线**，没有底色、没有圆角、没有边框盒。
 * 它在正文里看起来像一段旁注，而不是一张小卡片 —— 中栏里堆一排小卡片，那是另一种产品。
 */
function RailRow({ text, onJump }: { text: string; onJump?: () => void }) {
  return (
    <p
      onClick={onJump}
      className={cn(
        'break-words border-l-2 border-zinc-200 pl-2 text-[13px] leading-6 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400',
        onJump &&
          'cursor-pointer transition-colors hover:text-zinc-800 dark:hover:text-zinc-200'
      )}
    >
      {text}
    </p>
  )
}
