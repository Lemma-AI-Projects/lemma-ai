import { describe, expect, it } from 'vitest'

import { applyFrozenOrder } from './focusOrder'

const page = (id: string) => ({ id, title: `资料 ${id}` })

describe('资料次序冻结', () => {
  it('还没冻结时原样返回（不排序就是"我还没抄"）', () => {
    const pages = [page('a'), page('b'), page('c')]
    expect(applyFrozenOrder(pages, null).map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('服务端因为保存而重排后，冻结的次序把列表拉回来', () => {
    // 冻结时是 a b c；保存 c 之后 updated_at 变大，服务端把它顶到了最前。
    const frozen = ['a', 'b', 'c']
    const reordered = [page('c'), page('a'), page('b')]
    expect(applyFrozenOrder(reordered, frozen).map((p) => p.id)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('次序没变时是恒等变换（冻结不该自己制造变化）', () => {
    const frozen = ['a', 'b', 'c']
    const same = [page('a'), page('b'), page('c')]
    expect(applyFrozenOrder(same, frozen).map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('冻结之后新建的资料追加到末尾（刚建的笔记也找得到）', () => {
    const frozen = ['a', 'b']
    const withNew = [page('new-1'), page('b'), page('a'), page('new-2')]
    expect(applyFrozenOrder(withNew, frozen).map((p) => p.id)).toEqual([
      'a',
      'b',
      'new-1',
      'new-2',
    ])
  })

  it('删掉的资料自动跳过，剩下的保持冻结名次', () => {
    const frozen = ['a', 'b', 'c']
    const afterDelete = [page('c'), page('a')]
    expect(applyFrozenOrder(afterDelete, frozen).map((p) => p.id)).toEqual([
      'a',
      'c',
    ])
  })

  it('不改动传进来的数组本身', () => {
    const pages = [page('b'), page('a')]
    const frozen = ['a', 'b']
    applyFrozenOrder(pages, frozen)
    expect(pages.map((p) => p.id)).toEqual(['b', 'a'])
  })
})