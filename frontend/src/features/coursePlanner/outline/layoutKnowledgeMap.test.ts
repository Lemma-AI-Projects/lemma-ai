import { describe, expect, it } from 'vitest'

import { courseOutlineSample } from '@/mock/courseOutlineSample'
import { layoutKnowledgeMap } from './layoutKnowledgeMap'

/** 把只含 M / L / C 的 SVG path 按固定步长采样成点。 */
function samplePath(path: string): [number, number][] {
  const tokens = path.match(/[MLC]|-?\d+(?:\.\d+)?/g) ?? []
  const points: [number, number][] = []
  let index = 0
  let current: [number, number] = [0, 0]
  const read = (): [number, number] => [Number(tokens[index++]), Number(tokens[index++])]
  while (index < tokens.length) {
    const command = tokens[index++]
    if (command === 'M') {
      current = read()
    } else if (command === 'L') {
      const next = read()
      for (let t = 0; t <= 1; t += 0.05) {
        points.push([
          current[0] + (next[0] - current[0]) * t,
          current[1] + (next[1] - current[1]) * t,
        ])
      }
      current = next
    } else if (command === 'C') {
      const c1 = read()
      const c2 = read()
      const end = read()
      for (let t = 0; t <= 1; t += 0.02) {
        const u = 1 - t
        points.push([
          u ** 3 * current[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * end[0],
          u ** 3 * current[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * end[1],
        ])
      }
      current = end
    }
  }
  return points
}

describe('layoutKnowledgeMap', () => {
  const layout = layoutKnowledgeMap(
    courseOutlineSample.knowledgePoints,
    courseOutlineSample.prerequisites
  )
  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]))

  it('places every knowledge point exactly once, inside the canvas', () => {
    expect(layout.nodes.map((node) => node.id).sort()).toEqual(
      courseOutlineSample.knowledgePoints.map((point) => point.id).sort()
    )
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x + node.width).toBeLessThanOrEqual(layout.width + 0.5)
      expect(node.y + node.height).toBeLessThanOrEqual(layout.height)
    }
  })

  it('puts every prerequisite above the point that depends on it', () => {
    expect(layout.edges).toHaveLength(courseOutlineSample.prerequisites.length)
    for (const edge of layout.edges) {
      const from = nodeById.get(edge.from)
      const to = nodeById.get(edge.to)
      expect(from && to && from.y < to.y).toBe(true)
    }
  })

  it('keeps nodes on the same row from overlapping', () => {
    for (const a of layout.nodes) {
      for (const b of layout.nodes) {
        if (a === b || a.y !== b.y || a.x > b.x) continue
        expect(a.x + a.width).toBeLessThan(b.x)
      }
    }
  })

  it('never routes an edge through a node other than its own two ends', () => {
    for (const edge of layout.edges) {
      for (const [x, y] of samplePath(edge.path)) {
        for (const node of layout.nodes) {
          if (node.id === edge.from || node.id === edge.to) continue
          const inside =
            x > node.x + 1 &&
            x < node.x + node.width - 1 &&
            y > node.y + 1 &&
            y < node.y + node.height - 1
          expect(inside, `${edge.id} passes through ${node.id}`).toBe(false)
        }
      }
    }
  })

  it('is no wider than its widest row', () => {
    const rowExtents = new Map<number, number>()
    for (const node of layout.nodes) {
      rowExtents.set(node.y, (rowExtents.get(node.y) ?? 0) + node.width)
    }
    const rowCount = new Map<number, number>()
    for (const node of layout.nodes) {
      rowCount.set(node.y, (rowCount.get(node.y) ?? 0) + 1)
    }
    // 节点宽度之和 + 节点间距，再留出走线占位的余量。
    const widestPacked = Math.max(
      ...[...rowExtents.entries()].map(
        ([y, width]) => width + ((rowCount.get(y) ?? 1) - 1) * 14
      )
    )
    expect(layout.width).toBeLessThanOrEqual(widestPacked + 60)
  })

  it('sets isolated knowledge points apart below the graph', () => {
    const isolated = nodeById.get('notation')
    const graphBottom = Math.max(
      ...layout.nodes
        .filter((node) => node.id !== 'notation')
        .map((node) => node.y + node.height)
    )
    expect(isolated?.y).toBeGreaterThan(graphBottom)
    expect(layout.nodes.at(-1)?.id).toBe('notation')
  })

  it('survives degenerate input: empty, self-loops, unknown ids and cycles', () => {
    expect(layoutKnowledgeMap([], [])).toMatchObject({ nodes: [], edges: [] })

    const cyclic = layoutKnowledgeMap(
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
        { from: 'a', to: 'a' },
        { from: 'a', to: 'missing' },
      ]
    )
    expect(cyclic.nodes).toHaveLength(2)
    expect(cyclic.edges.map((edge) => edge.id)).toEqual(['a->b', 'b->a'])
  })
})
