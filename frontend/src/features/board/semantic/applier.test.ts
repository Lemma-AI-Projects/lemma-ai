import { describe, expect, it } from 'vitest'

import {
  applySuggestion,
  buildSnapshot,
  hasApplicableChanges,
  toPartials,
  undoSnapshot,
  type ShapePositionProvider,
} from './applier'
import type { LayoutSuggestion } from './types'

function moveSuggestion(): LayoutSuggestion {
  return {
    id: 'test',
    title: '对齐网格',
    description: '测试',
    changes: [
      { shapeId: 'a', type: 'move', from: { x: 13, y: 0 }, to: { x: 16, y: 0 } },
      { shapeId: 'b', type: 'move', from: { x: 300, y: 0 }, to: { x: 296, y: 0 } },
    ],
    estimatedImprovement: 0.1,
    automatic: true,
  }
}

function makeProvider(): {
  provider: ShapePositionProvider
  calls: Array<Array<{ id: string; x: number; y: number }>>
  positions: Map<string, { x: number; y: number }>
} {
  const calls: Array<Array<{ id: string; x: number; y: number }>> = []
  const positions = new Map<string, { x: number; y: number }>([
    ['a', { x: 13, y: 0 }],
    ['b', { x: 300, y: 0 }],
  ])
  const provider: ShapePositionProvider = {
    getShapePosition: (id) => positions.get(id) ?? null,
    updateShapes: (partials) => {
      const valid = partials.filter(
        (p): p is { id: string; x: number; y: number } => Boolean(p)
      )
      for (const p of valid) {
        positions.set(p.id, { x: p.x, y: p.y })
      }
      calls.push(valid)
    },
  }
  return { provider, calls, positions }
}

describe('buildSnapshot', () => {
  it('记录 move 型 change 的源位置', () => {
    const { provider } = makeProvider()
    const snapshot = buildSnapshot(moveSuggestion(), provider)
    expect(snapshot).toEqual({
      a: { x: 13, y: 0 },
      b: { x: 300, y: 0 },
    })
  })
})

describe('toPartials', () => {
  it('仅产出 move 型 partial，坐标取整', () => {
    const partials = toPartials(moveSuggestion())
    expect(partials).toEqual([
      { id: 'a', x: 16, y: 0 },
      { id: 'b', x: 296, y: 0 },
    ])
  })

  it('to 缺少坐标的 change → null（被 updateShapes 忽略）', () => {
    const suggestion: LayoutSuggestion = {
      id: 't',
      title: 't',
      description: '',
      changes: [{ shapeId: 'x', type: 'move', from: {}, to: {} }],
      estimatedImprovement: 0,
      automatic: false,
    }
    expect(toPartials(suggestion)).toEqual([null])
  })
})

describe('applySuggestion / undoSnapshot', () => {
  it('应用后位置变化，撤销后还原', () => {
    const { provider, positions, calls } = makeProvider()
    const snapshot = applySuggestion(moveSuggestion(), provider)
    expect(positions.get('a')).toEqual({ x: 16, y: 0 })
    expect(calls).toHaveLength(1)

    undoSnapshot(snapshot, provider)
    expect(positions.get('a')).toEqual({ x: 13, y: 0 })
    expect(positions.get('b')).toEqual({ x: 300, y: 0 })
    expect(calls).toHaveLength(2)
  })

  it('provider 查不到位置 → 快照跳过该 shape（安全）', () => {
    const provider: ShapePositionProvider = {
      getShapePosition: () => null,
      updateShapes: () => {},
    }
    const snapshot = buildSnapshot(moveSuggestion(), provider)
    expect(snapshot).toEqual({})
  })
})

describe('hasApplicableChanges', () => {
  it('有 move 型 change → true', () => {
    expect(hasApplicableChanges(moveSuggestion())).toBe(true)
  })

  it('无 change → false', () => {
    const s: LayoutSuggestion = {
      id: 't',
      title: 't',
      description: '',
      changes: [],
      estimatedImprovement: 0,
      automatic: false,
    }
    expect(hasApplicableChanges(s)).toBe(false)
  })
})
