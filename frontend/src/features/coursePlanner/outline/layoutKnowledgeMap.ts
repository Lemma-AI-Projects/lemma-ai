import {
  coordQuad,
  decrossTwoLayer,
  graphConnect,
  layeringSimplex,
  sugiyama,
  type GraphNode,
} from 'd3-dag'

import type { OutlineKnowledgePoint, OutlinePrerequisite } from './types'

// 知识地图的布局：前置在上、后学在下，箭头一律向下。
//
// 交给 d3-dag 的 Sugiyama 分层布局：单纯形法分层（总边长最短）、两层扫描减少交叉，
// 横坐标用 coordQuad——一个二次规划，同时惩罚连线偏离竖直和连线在途经点处的弯折，
// 跨层的长边因此是一道平滑的弧，而不是在每一层左右摆动；宽度也和手写布局相当，
// 放得进 36rem 的卡片（同样的数据 dagre 要宽近一倍）。
//
// 连线：竖直离开节点，在层与层之间的空白里用一道竖向 S 弯转向，穿过中间层时
// 沿着为它预留的走线位置竖直通过，最后竖直落到目标节点上，箭头正对节点。长边的
// 途经点会被拉直对齐，整条线是「一道弯 → 一段竖直线 → 一道弯」。
// 不与任何节点相连的知识点不进布局，单独排在图的下方。

const NODE_HEIGHT = 28
const NODE_GAP = 14
const LAYER_GAP = 52
const LABEL_FONT_SIZE = 12.5
const LABEL_PADDING_X = 11
const LEARNED_MARK_WIDTH = 16
/** 转弯处控制柄长度，占这一段竖向距离的比例；0.5 是常见的竖向连线形状。 */
const LINK_HANDLE = 0.5
/** 拉直途经点时，两条连线之间至少隔开的距离。 */
const PASS_SPACING = 10
/** 出入端口按另一端的方向在节点上下沿错开的程度，避免从一个点扫帚状散开。 */
const PORT_SPREAD = 0.18
/** 端口离节点左右两端（圆角）的最小距离。 */
const PORT_INSET = 16
/** 箭头尖端与目标节点上沿之间留的空隙。 */
const ARROW_INSET = 2
/** 比层间距略大，孤立知识点不会被读成图的最后一层。 */
const ISOLATED_GAP = LAYER_GAP + 8
const ISOLATED_ROW_GAP = 8
const MIN_ISOLATED_ROW_WIDTH = 320

export interface KnowledgeMapNode {
  id: string
  name: string
  learnedIn?: string
  x: number
  y: number
  width: number
  height: number
}

export interface KnowledgeMapEdge {
  id: string
  /** 前置知识点。 */
  from: string
  to: string
  /** SVG path，终点落在目标节点上沿上方 ARROW_INSET 处。 */
  path: string
}

export interface KnowledgeMapLayout {
  width: number
  height: number
  /** 按先后顺序排列（自上而下、自左而右），孤立知识点排在最后。 */
  nodes: KnowledgeMapNode[]
  edges: KnowledgeMapEdge[]
}

interface Point {
  x: number
  y: number
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

// 没有 DOM 可量，按字符估宽：全角字符一个字宽，其余按 0.62 个字宽。
function measureNodeWidth(point: OutlineKnowledgePoint): number {
  let labelWidth = 0
  for (const char of point.name) {
    labelWidth += char.charCodeAt(0) > 0xff ? LABEL_FONT_SIZE : LABEL_FONT_SIZE * 0.62
  }
  return Math.ceil(
    labelWidth + LABEL_PADDING_X * 2 + (point.learnedIn ? LEARNED_MARK_WIDTH : 0)
  )
}

/**
 * 依次连接各点的曲线（自上而下，y 递增），每个点处切线都竖直：相邻两点 x 相同时是
 * 一段直线，不同时是一道竖向 S 弯（控制柄各取这段高度的一半，和常见的竖向连线
 * 同一种形状）。调用方保证转弯只发生在层与层之间的空白里。
 */
function curvePath(points: Point[]): string {
  let path = `M ${round(points[0].x)} ${round(points[0].y)}`
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]
    const to = points[index]
    if (Math.abs(to.x - from.x) < 0.5) {
      path += ` L ${round(to.x)} ${round(to.y)}`
      continue
    }
    const handle = (to.y - from.y) * LINK_HANDLE
    path +=
      ` C ${round(from.x)} ${round(from.y + handle)},` +
      ` ${round(to.x)} ${round(to.y - handle)},` +
      ` ${round(to.x)} ${round(to.y)}`
  }
  return path
}

interface LayerItem {
  /** 节点的左右边界；途经点是宽度为 0 的一个点。 */
  left: number
  right: number
  /** 途经点所属的连线与序号，节点为 null。 */
  pass: { route: Point[]; index: number } | null
}

/**
 * 把长边的途经点拉直：每个途经点尽量对齐上一层的途经点，只要不越过同一层的
 * 其他节点或连线、也不贴得太近。拉直后长边是「一道弯 → 一段竖直线 → 一道弯」，
 * 不会在中间几层左右小幅摆动。
 */
function straightenPasses(
  routes: Point[][],
  nodeCenters: Iterable<{ center: Point; width: number }>
) {
  const layers = new Map<number, LayerItem[]>()
  const layerOf = (y: number) => {
    const key = Math.round(y)
    const list = layers.get(key) ?? []
    layers.set(key, list)
    return list
  }
  for (const { center, width } of nodeCenters) {
    layerOf(center.y).push({
      left: center.x - width / 2,
      right: center.x + width / 2,
      pass: null,
    })
  }
  for (const route of routes) {
    for (let index = 1; index < route.length - 1; index += 1) {
      layerOf(route[index].y).push({
        left: route[index].x,
        right: route[index].x,
        pass: { route, index },
      })
    }
  }

  for (const route of routes) {
    for (let index = 2; index < route.length - 1; index += 1) {
      const point = route[index]
      const target = route[index - 1].x
      const items = layers.get(Math.round(point.y)) ?? []
      const self = items.find(
        (item) => item.pass?.route === route && item.pass.index === index
      )
      if (!self) continue
      const low = Math.min(point.x, target)
      const high = Math.max(point.x, target)
      const blocked = items.some((item) => {
        if (item === self) return false
        const clearance = item.pass ? PASS_SPACING : NODE_GAP
        return item.right + clearance > low && item.left - clearance < high
      })
      if (blocked) continue
      point.x = target
      self.left = target
      self.right = target
    }
  }
}

/** 节点上沿 / 下沿的端口：朝另一端的方向偏一点，但不进左右两端的圆角。 */
function portX(centerX: number, width: number, towardX: number): number {
  const limit = Math.max(0, width / 2 - PORT_INSET)
  return centerX + Math.max(-limit, Math.min(limit, (towardX - centerX) * PORT_SPREAD))
}

export function layoutKnowledgeMap(
  points: readonly OutlineKnowledgePoint[],
  prerequisites: readonly OutlinePrerequisite[]
): KnowledgeMapLayout {
  const pointById = new Map(points.map((point) => [point.id, point]))

  // 丢掉自环、重复边和指向不存在节点的边。
  const seenEdges = new Set<string>()
  const edges = prerequisites.filter((edge) => {
    const key = `${edge.from}->${edge.to}`
    if (
      edge.from === edge.to ||
      !pointById.has(edge.from) ||
      !pointById.has(edge.to) ||
      seenEdges.has(key)
    ) {
      return false
    }
    seenEdges.add(key)
    return true
  })

  const connected = new Set<string>()
  for (const edge of edges) {
    connected.add(edge.from)
    connected.add(edge.to)
  }

  const widthById = new Map(
    points.map((point) => [point.id, measureNodeWidth(point)])
  )
  const centerById = new Map<string, Point>()
  const routes = new Map<string, Point[]>()
  let mainWidth = 0
  let mainHeight = 0

  if (edges.length > 0) {
    const graph = graphConnect()(edges.map((edge) => [edge.from, edge.to] as const))
    const layout = sugiyama()
      .layering(layeringSimplex())
      .decross(decrossTwoLayer())
      .coord(coordQuad())
      .nodeSize(
        (node: GraphNode<string>) =>
          [widthById.get(node.data) ?? 0, NODE_HEIGHT] as const
      )
      .gap([NODE_GAP, LAYER_GAP])
    const size = layout(graph)
    mainWidth = size.width
    mainHeight = size.height
    for (const node of graph.nodes()) {
      centerById.set(node.data, { x: node.x, y: node.y })
    }
    for (const link of graph.links()) {
      routes.set(
        `${link.source.data}->${link.target.data}`,
        link.points.map(([x, y]) => ({ x, y }))
      )
    }
    straightenPasses(
      [...routes.values()],
      [...centerById].map(([id, center]) => ({ center, width: widthById.get(id) ?? 0 }))
    )
  }

  // 孤立知识点：排在图的下方，一行放不下就换行。
  const isolatedRows: { point: OutlineKnowledgePoint; width: number }[][] = []
  const isolatedRowWidths: number[] = []
  const rowLimit = Math.max(mainWidth, MIN_ISOLATED_ROW_WIDTH)
  for (const point of points) {
    if (connected.has(point.id)) continue
    const width = widthById.get(point.id) ?? 0
    const last = isolatedRows.length - 1
    if (last >= 0 && isolatedRowWidths[last] + NODE_GAP + width <= rowLimit) {
      isolatedRows[last].push({ point, width })
      isolatedRowWidths[last] += NODE_GAP + width
    } else {
      isolatedRows.push([{ point, width }])
      isolatedRowWidths.push(width)
    }
  }

  const width = Math.ceil(Math.max(mainWidth, ...isolatedRowWidths, 0))
  const offsetX = (width - mainWidth) / 2

  const nodes: KnowledgeMapNode[] = []
  for (const point of points) {
    const center = centerById.get(point.id)
    if (!center) continue
    const nodeWidth = widthById.get(point.id) ?? 0
    nodes.push({
      id: point.id,
      name: point.name,
      learnedIn: point.learnedIn,
      x: round(center.x + offsetX - nodeWidth / 2),
      y: round(center.y - NODE_HEIGHT / 2),
      width: nodeWidth,
      height: NODE_HEIGHT,
    })
  }
  // 生成中按这个顺序逐个浮现：自上而下、自左而右。
  nodes.sort((a, b) => a.y - b.y || a.x - b.x)

  const layoutEdges: KnowledgeMapEdge[] = edges.map((edge) => {
    const id = `${edge.from}->${edge.to}`
    // d3-dag 的控制点从起点中心到终点中心，中间是各层的途经点。
    const route = (routes.get(id) ?? []).map((point) => ({
      x: point.x + offsetX,
      y: point.y,
    }))
    const source = route[0]
    const target = route[route.length - 1]
    const via = route.slice(1, -1)
    const startX = portX(
      source.x,
      widthById.get(edge.from) ?? 0,
      (via[0] ?? target).x
    )
    const endX = portX(
      target.x,
      widthById.get(edge.to) ?? 0,
      (via[via.length - 1] ?? source).x
    )
    const startY = source.y + NODE_HEIGHT / 2
    const endY = target.y - NODE_HEIGHT / 2 - ARROW_INSET
    // 途经点所在的那一层里竖直穿过（上沿进、下沿出），转弯只发生在层与层之间的
    // 空白里，曲线不会擦到同一层的节点。
    const passes = via.flatMap((point) => [
      { x: point.x, y: point.y - NODE_HEIGHT / 2 },
      { x: point.x, y: point.y + NODE_HEIGHT / 2 },
    ])
    const path = curvePath([{ x: startX, y: startY }, ...passes, { x: endX, y: endY }])
    return { id, from: edge.from, to: edge.to, path }
  })

  let cursorY = mainHeight
  if (isolatedRows.length > 0) {
    if (mainHeight > 0) cursorY += ISOLATED_GAP
    isolatedRows.forEach((row, rowIndex) => {
      let x = (width - isolatedRowWidths[rowIndex]) / 2
      for (const { point, width: nodeWidth } of row) {
        nodes.push({
          id: point.id,
          name: point.name,
          learnedIn: point.learnedIn,
          x: round(x),
          y: cursorY,
          width: nodeWidth,
          height: NODE_HEIGHT,
        })
        x += nodeWidth + NODE_GAP
      }
      cursorY += NODE_HEIGHT
      if (rowIndex < isolatedRows.length - 1) cursorY += ISOLATED_ROW_GAP
    })
  }

  return {
    width,
    height: Math.ceil(cursorY),
    nodes,
    edges: layoutEdges,
  }
}
