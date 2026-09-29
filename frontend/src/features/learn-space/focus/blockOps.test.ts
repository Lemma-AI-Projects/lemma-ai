import { beforeEach, describe, expect, it } from 'vitest'

import type { DocBlock } from '@/features/docs/types'
import {
  appendBlock,
  blocksFromDraft,
  draftFromBlocks,
  isBlank,
  mergeBack,
  moveBy,
  newBlock,
  outlineOf,
  removeBlock,
  resetKeys,
  setHeading,
  setType,
  signatureOf,
  splitAt,
  textOf,
  typeAfterEnter,
  updateText,
  type DraftBlock,
} from './blockOps'

function block(
  type: string,
  content: Record<string, unknown>,
  meta: Record<string, unknown> | null = null
): DocBlock {
  return { id: 'server-id', type, position: 0, content, meta }
}

function draftOf(...types: string[]): DraftBlock[] {
  return draftFromBlocks(
    types.map((type) => block(type, { text: '' }))
  )
}

beforeEach(() => {
  resetKeys()
})

describe('草稿 ↔ 写请求', () => {
  it('存下来的块读成草稿，内容与 meta 都带着', () => {
    const draft = draftFromBlocks([
      block('heading', { text: '特征值', level: 2 }),
      block('paragraph', { text: '正文' }, { source: { pageId: 'x' } }),
    ])
    expect(draft.map((item) => item.type)).toEqual(['heading', 'paragraph'])
    expect(draft[0].content).toEqual({ text: '特征值', level: 2 })
    expect(draft[1].meta).toEqual({ source: { pageId: 'x' } })
  })

  it('写请求里 position 就是下标、id 一律 null（后端整页重写，id 不稳定）', () => {
    const draft = draftFromBlocks([block('paragraph', { text: 'a' }), block('quote', { text: 'b' })])
    expect(blocksFromDraft(draft)).toEqual([
      { id: null, type: 'paragraph', position: 0, content: { text: 'a' }, meta: null },
      { id: null, type: 'quote', position: 1, content: { text: 'b' }, meta: null },
    ])
  })

  it('meta 必须原样回去 —— 每次保存都是整页重写，不回传就等于抹掉它', () => {
    const meta = { source: { blockId: 'anchor' } }
    const draft = draftFromBlocks([block('paragraph', { text: 'a' }, meta)])
    expect(blocksFromDraft(draft)[0].meta).toEqual(meta)
  })

  it('指纹只看内容与类型，不看本地 key', () => {
    const first = draftFromBlocks([block('paragraph', { text: 'a' })])
    const second = draftFromBlocks([block('paragraph', { text: 'a' })])
    expect(signatureOf(first)).toBe(signatureOf(second))
    expect(signatureOf(first)).not.toBe(signatureOf(draftFromBlocks([block('paragraph', { text: 'b' })])))
  })
})

describe('大纲', () => {
  it('只挑有字的标题，带层级与位置', () => {
    const draft = draftFromBlocks([
      block('heading', { text: '一', level: 1 }),
      block('paragraph', { text: '正文' }),
      block('heading', { text: '  ', level: 2 }),
      block('heading', { text: '二', level: 3 }),
    ])
    expect(outlineOf(draft)).toEqual([
      { key: draft[0].key, index: 0, text: '一', level: 1 },
      { key: draft[3].key, index: 3, text: '二', level: 3 },
    ])
  })

  it('没有标题就是空大纲（不编造）', () => {
    expect(outlineOf(draftFromBlocks([block('paragraph', { text: '正文' })]))).toEqual([])
  })
})

describe('回车分块', () => {
  it('在光标处切开，后半段留在新块里，光标落在新块开头', () => {
    const draft = draftFromBlocks([block('paragraph', { text: '前半后半' })])
    const result = splitAt(draft, draft[0].key, 2)
    expect(result.draft.map((item) => textOf(item))).toEqual(['前半', '后半'])
    expect(result.focus).toEqual({ key: result.draft[1].key, at: 0 })
  })

  it('标题切出来的后半段降级成正文', () => {
    const draft = draftFromBlocks([block('heading', { text: '标题正文', level: 2 })])
    const result = splitAt(draft, draft[0].key, 2)
    expect(result.draft[0].type).toBe('heading')
    expect(result.draft[1].type).toBe('paragraph')
  })

  it('标题之后回车给正文，代码块里回车不分块', () => {
    expect(typeAfterEnter('heading')).toBe('paragraph')
    expect(typeAfterEnter('list')).toBe('list')
    expect(typeAfterEnter('code')).toBeNull()
  })
})

describe('退格合块', () => {
  it('并进上一块，光标停在接缝处', () => {
    const draft = draftFromBlocks([
      block('paragraph', { text: '第一段' }),
      block('paragraph', { text: '第二段' }),
    ])
    const result = mergeBack(draft, draft[1].key)
    expect(result.draft).toHaveLength(1)
    expect(textOf(result.draft[0])).toBe('第一段第二段')
    expect(result.focus).toEqual({ key: draft[0].key, at: 3 })
  })

  it('类型不同就不动 —— 退格不该把引用吞进正文', () => {
    const draft = draftFromBlocks([
      block('quote', { text: '引用' }),
      block('paragraph', { text: '正文' }),
    ])
    expect(mergeBack(draft, draft[1].key).draft).toHaveLength(2)
  })

  it('第一块不动（没有上一块可并）', () => {
    const draft = draftFromBlocks([block('paragraph', { text: '唯一一段' })])
    expect(mergeBack(draft, draft[0].key).draft).toHaveLength(1)
  })

  it('列表项并进上一项', () => {
    const draft = draftFromBlocks([block('list', { items: ['甲', '乙'], ordered: false })])
    const result = mergeBack(draft, draft[0].key, 1)
    expect(result.draft[0].content.items).toEqual(['甲乙'])
    expect(result.focus).toEqual({ key: draft[0].key, item: 0, at: 1 })
  })

  it('空的列表项被退掉：整块降级成正文，而不是留一个空壳', () => {
    const draft = draftFromBlocks([block('list', { items: [''], ordered: false })])
    const degraded = mergeBack(draft, draft[0].key, 0)
    expect(degraded.draft[0].type).toBe('paragraph')
    expect(textOf(degraded.draft[0])).toBe('')
  })

  it('中间那一项是空的：只退掉这一项，不吞上一项的字', () => {
    const draft = draftFromBlocks([block('list', { items: ['甲', '', '丙'], ordered: false })])
    const result = mergeBack(draft, draft[0].key, 1)
    expect(result.draft[0].content.items).toEqual(['甲', '丙'])
  })

  it('两个相邻的列表块并起来，中间那处接上', () => {
    const draft = draftFromBlocks([
      block('list', { items: ['甲', '乙'], ordered: false }),
      block('list', { items: ['丙'], ordered: false }),
    ])
    const result = mergeBack(draft, draft[1].key, 0)
    expect(result.draft).toHaveLength(1)
    expect(result.draft[0].content.items).toEqual(['甲', '乙丙'])
  })
})

describe('换类型', () => {
  it('段落换列表按换行拆项，列表换段落再拼回来', () => {
    const draft = draftFromBlocks([block('paragraph', { text: '甲\n乙' })])
    const asList = setType(draft, draft[0].key, 'list').draft
    expect(asList[0].content.items).toEqual(['甲', '乙'])
    const back = setType(asList, asList[0].key, 'paragraph').draft
    expect(textOf(back[0])).toBe('甲\n乙')
  })

  it('「标题 2」一步到位：正文变标题也要带上层级，文字不丢', () => {
    const draft = draftFromBlocks([block('paragraph', { text: '特征值' })])
    const result = setHeading(draft, draft[0].key, 2)
    expect(result.draft[0].type).toBe('heading')
    expect(result.draft[0].content).toEqual({ text: '特征值', level: 2 })
    const again = setHeading(result.draft, result.draft[0].key, 1)
    expect(again.draft[0].content).toEqual({ text: '特征值', level: 1 })
  })

  it('换成分割线就把文字放下了（它没有文本）', () => {
    const draft = draftFromBlocks([block('paragraph', { text: '甲' })])
    expect(setType(draft, draft[0].key, 'divider').draft[0].content).toEqual({})
  })

  it('空块判定：空白段落算空，分割线不算', () => {
    const draft = draftFromBlocks([
      block('paragraph', { text: '   ' }),
      block('divider', {}),
    ])
    expect(isBlank(draft[0])).toBe(true)
    expect(isBlank(draft[1])).toBe(false)
  })
})

describe('挪动与增删', () => {
  it('Alt+↑ 换位置，到边界原样返回', () => {
    const draft = draftFromBlocks([
      block('paragraph', { text: '一' }),
      block('paragraph', { text: '二' }),
    ])
    const moved = moveBy(draft, draft[1].key, -1)
    expect(moved.draft.map((item) => textOf(item))).toEqual(['二', '一'])
    expect(moveBy(draft, draft[0].key, -1).draft.map((item) => textOf(item))).toEqual(['一', '二'])
  })

  it('删一块，光标回到上一块末尾', () => {
    const draft = draftFromBlocks([
      block('paragraph', { text: '一' }),
      block('paragraph', { text: '二' }),
    ])
    const result = removeBlock(draft, draft[1].key)
    expect(result.draft).toHaveLength(1)
    expect(result.focus).toEqual({ key: draft[0].key, at: 'end' })
  })

  it('末尾补一块并聚焦它；单条文本改动只碰那一块', () => {
    expect(appendBlock([], 'paragraph').draft).toHaveLength(1)
    const draft = draftFromBlocks([block('paragraph', { text: '甲' })])
    const next = updateText(draft, draft[0].key, '乙')
    expect(textOf(next[0])).toBe('乙')
    expect(textOf(draft[0])).toBe('甲')
  })

  it('找不到 key 的编辑是空操作，不抛错（陈旧事件不该炸页面）', () => {
    const draft = draftOf('paragraph')
    expect(updateText(draft, '不存在', 'x')).toBe(draft)
    expect(mergeBack(draft, '不存在').draft).toBe(draft)
    expect(removeBlock(draft, '不存在').draft).toBe(draft)
  })

  it('newBlock 每次给不同的本地 key', () => {
    expect(newBlock().key).not.toBe(newBlock().key)
  })
})
