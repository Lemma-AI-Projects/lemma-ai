import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/lib/apiClient', () => ({ apiClient: { post } }))

import { buildBoardContextBody, createBoardContext } from './boardContextApi'

beforeEach(() => {
  post.mockReset()
})

describe('buildBoardContextBody 的 wire 形状', () => {
  it('默认值补齐：source=selection、selectionMode=rectangle、label/boundingBox=null', () => {
    expect(
      buildBoardContextBody({
        projectId: 'p1',
        items: [{ shapeId: 'blk-1', type: 'block', text: '矩阵' }],
      })
    ).toEqual({
      projectId: 'p1',
      label: null,
      source: 'selection',
      selectionMode: 'rectangle',
      boundingBox: null,
      items: [{ shapeId: 'blk-1', type: 'block', text: '矩阵' }],
    })
  })

  it('显式给的值原样过，不被默认值盖掉', () => {
    const body = buildBoardContextBody({
      projectId: 'p1',
      label: '矩阵基础',
      source: 'cluster',
      selectionMode: 'lasso',
      boundingBox: { x: 1, y: 2, w: 3, h: 4 },
      items: [],
    })
    expect(body.label).toBe('矩阵基础')
    expect(body.source).toBe('cluster')
    expect(body.selectionMode).toBe('lasso')
    expect(body.boundingBox).toEqual({ x: 1, y: 2, w: 3, h: 4 })
  })

  it('一律 camelCase（shapeId / connectedIds），没有 snake_case 漏网', () => {
    const body = buildBoardContextBody({
      projectId: 'p1',
      items: [
        {
          shapeId: 'blk-1',
          type: 'block',
          text: '矩阵',
          connectedIds: ['blk-2'],
        },
      ],
    })
    const item = (body.items as Record<string, unknown>[])[0]
    expect(Object.keys(item)).toEqual([
      'shapeId',
      'type',
      'text',
      'connectedIds',
    ])
  })
})

describe('createBoardContext', () => {
  it('POST 到 /api/v1/board/contexts，并把返回的包原样交回', async () => {
    const bundle = { id: 'b1', itemCount: 1 }
    post.mockResolvedValue({ data: bundle })
    const result = await createBoardContext({
      projectId: 'p1',
      items: [{ shapeId: 'blk-1', type: 'block', text: '矩阵' }],
    })
    expect(post).toHaveBeenCalledWith('/api/v1/board/contexts', {
      projectId: 'p1',
      label: null,
      source: 'selection',
      selectionMode: 'rectangle',
      boundingBox: null,
      items: [{ shapeId: 'blk-1', type: 'block', text: '矩阵' }],
    })
    expect(result).toBe(bundle)
  })
})
