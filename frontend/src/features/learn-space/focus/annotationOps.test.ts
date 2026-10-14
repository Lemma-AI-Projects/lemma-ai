import { describe, expect, it } from 'vitest'

import {
  blockText,
  buildAnnotationSource,
  buildRailGroups,
  isAnnotationShortcut,
  readAnnotationSource,
  resolveAnnotationSource,
  type AnnotationSource,
  type NoteBlock,
} from './annotationOps'

function block(key: string, text: string) {
  return { key, type: 'paragraph', content: { text } }
}

const PAGE = 'page-1'

describe('buildAnnotationSource', () => {
  const blocks = [block('a', '第一段'), block('b', '第二段'), block('c', '又是第一段')]

  it('记下位置、原话和页', () => {
    const source = buildAnnotationSource(blocks, 'b', '第二段', PAGE)
    expect(source).toEqual({ pageId: PAGE, position: 1, quote: '第二段', occurrence: 0 })
  })

  it('同样的原话出现两次时，occurrence 数的是它前面的那些', () => {
    const source = buildAnnotationSource(blocks, 'c', '第一段', PAGE)
    // 「第一段」在 a 里也出现了一次，所以 c 上这句是第 1 次出现
    expect(source?.occurrence).toBe(1)
  })

  it('不锚 blockId —— 返回值里没有它', () => {
    const source = buildAnnotationSource(blocks, 'b', '第二段', PAGE)
    expect(source).not.toHaveProperty('blockId')
  })

  it('找不到那块 / 空引用都返回 null（不造假锚点）', () => {
    expect(buildAnnotationSource(blocks, '不存在', 'x', PAGE)).toBeNull()
    expect(buildAnnotationSource(blocks, 'b', '   ', PAGE)).toBeNull()
  })
})

describe('resolveAnnotationSource', () => {
  it('一级：没编辑过，原样命中', () => {
    const blocks = [block('a', '第一段'), block('b', '第二段')]
    const source: AnnotationSource = { pageId: PAGE, position: 1, quote: '第二段', occurrence: 0 }
    expect(resolveAnnotationSource(blocks, source)).toBe(1)
  })

  it('二级：用户在前头插了一段，位置全移位也对得上', () => {
    const blocks = [block('x', '新插的'), block('a', '第一段'), block('b', '第二段')]
    const source: AnnotationSource = { pageId: PAGE, position: 1, quote: '第二段', occurrence: 0 }
    expect(resolveAnnotationSource(blocks, source)).toBe(2)
  })

  it('二级：重复原话按 occurrence 分清是哪一个', () => {
    const blocks = [block('a', '一样的'), block('b', '垫句'), block('c', '一样的')]
    const first: AnnotationSource = { pageId: PAGE, position: 0, quote: '一样的', occurrence: 0 }
    const second: AnnotationSource = { pageId: PAGE, position: 2, quote: '一样的', occurrence: 1 }
    expect(resolveAnnotationSource(blocks, first)).toBe(0)
    expect(resolveAnnotationSource(blocks, second)).toBe(2)
  })

  it('三级：原话被删了 ⇒ null，不猜一个邻近位置', () => {
    const blocks = [block('a', '第一段'), block('b', '完全变了')]
    const source: AnnotationSource = { pageId: PAGE, position: 1, quote: '第二段', occurrence: 0 }
    expect(resolveAnnotationSource(blocks, source)).toBeNull()
  })
})

describe('isAnnotationShortcut（「记一句」的发起键）', () => {
  /** 一个「什么修饰键都没按、选了一句话」的按键。 */
  const pressed = (over: Partial<Parameters<typeof isAnnotationShortcut>[0]> = {}) =>
    isAnnotationShortcut({
      key: 'n',
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      selectionStart: 3,
      selectionEnd: 8,
      ...over,
    })

  it('n + 真选中 ⇒ 是', () => {
    expect(pressed()).toBe(true)
  })

  it('大写 N（Shift）也算 —— 用户按的是同一个键', () => {
    expect(pressed({ key: 'N' })).toBe(true)
  })

  /**
   * ⚠️ **这条是承重的**：没有选中时 `n` 就是用户要打进去的那个字母。
   * 拦下来 = 吞字。这一条挂了说明「选中即写」被做回来了。
   */
  it('n + 没有选中（光标塌成一点）⇒ 不是，绝不吞字', () => {
    expect(pressed({ selectionStart: 5, selectionEnd: 5 })).toBe(false)
    expect(pressed({ selectionStart: 0, selectionEnd: 0 })).toBe(false)
  })

  it('n + 任何修饰键 ⇒ 不是（留给别处的快捷键）', () => {
    expect(pressed({ metaKey: true })).toBe(false)
    expect(pressed({ ctrlKey: true })).toBe(false)
    expect(pressed({ altKey: true })).toBe(false)
  })

  it('别的字母 + 有选中 ⇒ 不是', () => {
    expect(pressed({ key: 'm' })).toBe(false)
    expect(pressed({ key: 'Enter' })).toBe(false)
  })

  it('拿不到选区（非文本控件，两个都是 null）⇒ 不是', () => {
    expect(pressed({ selectionStart: null, selectionEnd: null })).toBe(false)
  })
})

describe('readAnnotationSource', () => {
  const good: AnnotationSource = {
    pageId: PAGE,
    position: 2,
    quote: '罗尔定理的推广',
    occurrence: 1,
  }

  it('形状对就读得出来', () => {
    expect(readAnnotationSource({ source: good })).toEqual(good)
  })

  it('meta 里没有 source / meta 本身是空 ⇒ null（笔记页里手打的块就是这样）', () => {
    expect(readAnnotationSource(null)).toBeNull()
    expect(readAnnotationSource(undefined)).toBeNull()
    expect(readAnnotationSource({})).toBeNull()
    expect(readAnnotationSource({ source: null })).toBeNull()
  })

  /**
   * ⚠️ **逐字段校验，不是类型断言**。`meta` 在 wire 上就是
   * `Record<string, unknown>`；断言成 `AnnotationSource` 会把"锚点被写坏了"
   * 从"读不到"降级成"读到一堆 undefined"，然后拿它去反查位置。
   */
  it('缺字段 / 类型不对 ⇒ null，不返回半条锚点', () => {
    expect(readAnnotationSource({ source: { ...good, position: '2' } })).toBeNull()
    expect(readAnnotationSource({ source: { ...good, quote: 42 } })).toBeNull()
    expect(readAnnotationSource({ source: { ...good, occurrence: null } })).toBeNull()
    expect(readAnnotationSource({ source: { pageId: PAGE, position: 0 } })).toBeNull()
  })

  it('多出来的字段不干扰（往后加字段不该让老数据读不出来）', () => {
    const src = readAnnotationSource({ source: { ...good, color: 'red' } })
    expect(src).toEqual(good)
  })
})

describe('blockText', () => {
  it('段落取 content.text', () => {
    expect(blockText(block('a', '一句话'))).toBe('一句话')
  })

  it('list 块把所有项拼起来 —— 否则列表上的边注读出来是空的', () => {
    expect(
      blockText({ type: 'list', content: { items: ['甲', '乙'] } })
    ).toBe('甲\n乙')
  })

  it('没有文本就是空串，不是 undefined', () => {
    expect(blockText({ type: 'divider', content: {} })).toBe('')
  })
})

describe('buildRailGroups', () => {
  /** 笔记页里的一块：`key` 是它自己的 id，`source` 是锚点（手打的块没有）。 */
  function note(key: string, text: string, source: AnnotationSource | null): NoteBlock {
    return { key, type: 'paragraph', content: { text }, source }
  }

  const source = (position: number, quote: string, occurrence = 0): AnnotationSource => ({
    pageId: PAGE,
    position,
    quote,
    occurrence,
  })

  const material = [
    block('b0', '第三章 微分学'),
    block('b1', '罗尔定理：两端函数值相等。'),
    block('b2', '拉格朗日中值定理是罗尔定理的推广。'),
  ]

  it('锚在第二块的注 ⇒ 进 placed，带着那一块的 key', () => {
    const layout = buildRailGroups(material, [
      note('n0', '这是推广', source(2, '罗尔定理的推广')),
    ])
    expect(layout.placed).toHaveLength(1)
    expect(layout.placed[0].blockKey).toBe('b2')
    expect(layout.placed[0].position).toBe(2)
    expect(layout.placed[0].annotations).toEqual([{ key: 'n0', text: '这是推广' }])
    expect(layout.loose).toEqual([])
  })

  /** A5：锚在同一段的多条要能一起渲染（一组共用一个 top），顺序照写的顺序。 */
  it('锚在同一块的两条 ⇒ 一组两条，顺序不变', () => {
    const layout = buildRailGroups(material, [
      note('n0', '第一条', source(2, '罗尔定理的推广')),
      note('n1', '第二条', source(2, '罗尔定理的推广')),
    ])
    expect(layout.placed).toHaveLength(1)
    expect(layout.placed[0].annotations.map((a) => a.text)).toEqual(['第一条', '第二条'])
  })

  it('两个不同的块 ⇒ 两组，按写成的先后', () => {
    const layout = buildRailGroups(material, [
      note('n0', '注在开头', source(1, '两端函数值相等')),
      note('n1', '注在第三块', source(2, '罗尔定理的推广')),
    ])
    expect(layout.placed.map((g) => g.blockKey)).toEqual(['b1', 'b2'])
  })

  it('用户在前头插了一段（位置全移位）⇒ 照 quote 找回来', () => {
    const inserted = [block('bx', '新插的'), ...material]
    const layout = buildRailGroups(inserted, [
      note('n0', '这是推广', source(2, '罗尔定理的推广')),
    ])
    expect(layout.placed[0].blockKey).toBe('b2')
    expect(layout.placed[0].position).toBe(3)
  })

  it('原话被删了 ⇒ 进 loose，既不在 placed 里也没被丢掉', () => {
    const edited = [material[0], block('b1', '整段改写了'), material[2]]
    const layout = buildRailGroups(edited, [
      note('n0', '两端函数值相等那段', source(1, '两端函数值相等')),
    ])
    expect(layout.placed).toEqual([])
    expect(layout.loose).toEqual([{ key: 'n0', text: '两端函数值相等那段' }])
  })

  it('笔记页里手打的普通块（没有锚点）不进轨 —— 它不是边注', () => {
    const layout = buildRailGroups(material, [
      note('n0', '随手记的一句', null),
      note('n1', '这是推广', source(2, '罗尔定理的推广')),
    ])
    expect(layout.placed).toHaveLength(1)
    expect(layout.loose).toEqual([])
  })

  it('一条边注都没有 ⇒ 两边都空（调用方据此整条轨都不渲染）', () => {
    expect(buildRailGroups(material, [])).toEqual({ placed: [], loose: [] })
    expect(buildRailGroups([], [note('n0', 'x', source(0, 'y'))])).toEqual({
      placed: [],
      loose: [{ key: 'n0', text: 'x' }],
    })
  })
})
