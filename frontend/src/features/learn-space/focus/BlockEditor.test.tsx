import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { BlockEditor } from './BlockEditor'
import { newBlock, type DraftBlock } from './blockOps'

/**
 * 圈选（Mala）的静态断言。
 *
 * ⚠️ **这个文件抓不到什么，先说清楚**：本仓库没有 jsdom
 * （`vite.config.ts` 的 `environment: 'node'`），所有组件测试都是
 * `renderToStaticMarkup` 的静态断言 —— **跑不了事件序列**。
 * 所以"连点三块只选中一块"那个覆盖 bug（组件基于 prop 旧值算新集合）
 * 在这里没有任何防线，它靠真界面验。规则本身在 `blockOps.test.ts`。
 *
 * 这个文件真正守的是**视觉约定**（`.plans/mala-note/selected-block-language.md`）：
 * 选中态长什么样、以及更重要的 —— **选中不改排版**。
 */

const noop = () => undefined

function textareaClassOf(markup: string, blockKey: string): string {
  const at = markup.indexOf(`data-block-key="${blockKey}"`)
  if (at === -1) return ''
  // data-item-index 是 textarea 的属性，且排在 class 之前，所以窗口里第一个
  // class 就是它的。窗口给大一点：外层 div 与左侧菜单都在它前面。
  const seg = markup.slice(at, at + 1600)
  const found = seg.match(/data-item-index="0"[^>]*class="([^"]*)"/)
  return found ? found[1] : ''
}

function render(blocks: DraftBlock[], selected?: ReadonlySet<string>): string {
  return renderToStaticMarkup(
    <BlockEditor
      blocks={blocks}
      onChange={noop}
      selectedKeys={selected}
      onSelectionToggle={noop}
      onSelectionClear={noop}
    />
  )
}

describe('BlockEditor 圈选（静态断言）', () => {
  const blocks = [newBlock('paragraph'), newBlock('heading')]

  it('选中的块带 data-selected，未选中的不带', () => {
    const markup = render(blocks, new Set([blocks[0].key]))
    expect(markup).toContain(`data-block-key="${blocks[0].key}" data-selected="true"`)
    expect(markup).toContain(`data-block-key="${blocks[1].key}" class=`)
    // 未选中那块不能残留 selected
    const secondAt = markup.indexOf(`data-block-key="${blocks[1].key}"`)
    expect(markup.slice(secondAt, secondAt + 120)).not.toContain('data-selected')
  })

  it('选中的块有那条色条，未选中的没有', () => {
    const markup = render(blocks, new Set([blocks[0].key]))
    const firstAt = markup.indexOf(`data-block-key="${blocks[0].key}"`)
    const secondAt = markup.indexOf(`data-block-key="${blocks[1].key}"`)
    expect(markup.slice(firstAt, secondAt)).toContain('bg-foreground')
    expect(markup.slice(secondAt)).not.toContain('bg-foreground')
  })

  it('不传圈选 props（只读面板 / 预览）时，一个块都不标记', () => {
    const markup = renderToStaticMarkup(
      <BlockEditor blocks={blocks} onChange={noop} readOnly />
    )
    expect(markup).not.toContain('data-selected')
    expect(markup).not.toContain('bg-foreground')
  })

  /**
   * ⚠️ **这是本文件最重要的一条**：选中只改文字浓度，不改排版。
   * 判据是机械的 —— 把选中态新增的那个文字色类去掉之后，class 必须逐字相同。
   * 一旦有人"顺手"让选中也加个字号或行高，这条会挂。
   */
  it('选中只改文字浓度：class 除文字色之外逐字相同', () => {
    const plain = textareaClassOf(render(blocks), blocks[0].key)
    const selected = textareaClassOf(render(blocks, new Set([blocks[0].key])), blocks[0].key)
    expect(plain.trim()).not.toBe('')
    expect(selected.trim()).not.toBe(plain.trim())
    // 两边都 trim：未选中时 class 数组末尾是空串，join 出来带一个尾空格，
    // 那是拼装的副产品，不是选中态多出来的东西。
    expect(selected.replace(SELECTED_TONE, '').trim()).toBe(plain.trim())
    // 而且只多了那几个类（SELECTED_TONE 是两个：常规 + dark），没多别的
    const toneClasses = SELECTED_TONE.split(' ').filter(Boolean).length
    expect(selected.split(' ').filter(Boolean).length).toBe(
      plain.split(' ').filter(Boolean).length + toneClasses
    )
  })
})

/** 与 BlockEditor 里的 `SELECTED_TEXT_CLASS` 对应。⚠️ 改了那边要改这里 ——
 *  这个重复是刻意的：测试不该 import 被测模块的常量，否则是被测代码证明被测代码。 */
const SELECTED_TONE = 'text-zinc-950 dark:text-zinc-50'
