import { describe, expect, it } from 'vitest'

import {
  buildAnnotationSource,
  isAnnotationShortcut,
  resolveAnnotationSource,
  type AnnotationSource,
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
