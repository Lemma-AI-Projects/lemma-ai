import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AnnotationRail } from './AnnotationRail'
import type { RailLayout } from './annotationOps'

/**
 * 边注轨的静态断言。
 *
 * ⚠️ **这个文件抓不到什么，先说清楚**：本仓库没有 jsdom（`vite.config.ts` 的
 * `environment: 'node'`），组件测试是 `renderToStaticMarkup` 的静态断言 ——
 * **跑不了事件序列**，也**量不到像素**。所以：
 * - §4 第 2 条（边注与所锚段落同一水平线，偏差 ≤ 4px）**在这里没有任何防线**，
 *   它靠真界面量；这里只能钉住"分组是对的、组的 key 是那块"。
 * - "点那一行跳过去"也在这里测不了（没有 click）。
 *
 * 这里真正守的是两件机械的事：
 * 1. **零控件**（§4 第 3 条"数 `<button>`"）—— 而且不只数标签，还数
 *    `role="button"` / `tabindex`：加个 role 就把闸门糊过去是最省事的作弊。
 * 2. **空态什么都不渲染**（§4 第 5 条）。
 */

const noop = () => undefined

function render(layout: RailLayout): string {
  return renderToStaticMarkup(<AnnotationRail layout={layout} onJump={noop} />)
}

describe('AnnotationRail 零控件（§4 第 3 条）', () => {
  const layout: RailLayout = {
    placed: [
      {
        blockKey: 'b2',
        position: 2,
        annotations: [
          { key: 'n0', text: '这是罗尔定理的推广' },
          { key: 'n1', text: '几何解释：切线与割线平行' },
        ],
      },
    ],
    loose: [{ key: 'n9', text: '原话已经不在这一页了' }],
  }

  it('有内容时该出现的话都在', () => {
    const markup = render(layout)
    expect(markup).toContain('这是罗尔定理的推广')
    expect(markup).toContain('几何解释：切线与割线平行')
    expect(markup).toContain('原话已经不在这一页了')
  })

  it('没有 <button>', () => {
    expect(render(layout)).not.toContain('<button')
  })

  /**
   * ⚠️ **这条是免得有人用 `role="button"` 把上面那条糊过去** —— 那样"数 button"
   * 全绿，而边注轨实际上长出了一排语义上的控件，正好是大道至简要拦的东西。
   */
  it('也没有伪装成文本的控件（role=button / tabindex）', () => {
    const markup = render(layout).toLowerCase()
    expect(markup).not.toContain('role="button"')
    expect(markup).not.toContain('tabindex')
  })

  it('形状是 A4：左侧 2px 细线 + 更淡的文字（裸文字，不是卡片）', () => {
    const markup = render(layout)
    expect(markup).toContain('border-l-2')
    expect(markup).toContain('border-zinc-200')
    expect(markup).toContain('text-zinc-500')
    // 不是卡片：没有圆角、没有整圈边框
    expect(markup).not.toContain('rounded')
    expect(markup).not.toContain('border border-')
  })
})

describe('AnnotationRail 空态（§4 第 5 条）', () => {
  it('一条边注都没有 ⇒ 整条轨不渲染（不是渲染一句「还没有边注」）', () => {
    const markup = render({ placed: [], loose: [] })
    expect(markup).toBe('')
    expect(markup).not.toContain('还没有')
  })

  it('只有 loose（原话都找不到了）也要渲染 —— 边注是用户的话，不能丢', () => {
    const markup = render({ placed: [], loose: [{ key: 'n0', text: '还在' }] })
    expect(markup).toContain('还在')
  })
})

describe('AnnotationRail 分组（A5）', () => {
  it('锚在同一块的若干条渲染在同一个容器里（共用一个测量出来的 top）', () => {
    const markup = render({
      placed: [
        { blockKey: 'b1', position: 1, annotations: [{ key: 'n0', text: '甲' }] },
        { blockKey: 'b2', position: 2, annotations: [{ key: 'n1', text: '乙' }] },
      ],
      loose: [],
    })
    // 两组 = 两个定位容器；组内多条共用它 ⇒ 只数最外层的那些。
    expect(markup.match(/class="absolute inset-x-0 space-y-2"/g) ?? []).toHaveLength(2)
  })

  /**
   * ⚠️ 这两个钩子是 §4 第 2 条（偏差 ≤ 4px）**唯一量得到的方式** —— 静态断言量不到
   * 排版，只能靠一个真排版引擎按块查。钩子被删掉的话，那条验收就悄悄做不成了。
   */
  it('每组带 data-rail-for=<块 key>，好让真浏览器按块量对齐', () => {
    const markup = render({
      placed: [
        { blockKey: 'b1', position: 1, annotations: [{ key: 'n0', text: '甲' }] },
        { blockKey: 'b2', position: 2, annotations: [{ key: 'n1', text: '乙' }] },
      ],
      loose: [{ key: 'n9', text: '找不到原话的' }],
    })
    expect(markup).toContain('data-rail-for="b1"')
    expect(markup).toContain('data-rail-for="b2"')
    // loose 那一组不锚任何块 ⇒ 不给 data-rail-for（给了就等于说它对得上）
    expect(markup).toContain('data-rail-loose="true"')
    expect(markup.match(/data-rail-for=/g) ?? []).toHaveLength(2)
  })
})
