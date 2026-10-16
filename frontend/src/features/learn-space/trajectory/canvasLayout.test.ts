import { describe, expect, it } from 'vitest'

import { NODE_ROW_H, TIME_HEIGHT, lodFor, toCanvasNodes } from './canvasLayout'
import type { TrajectoryEvent, TrajectoryKind } from './trajectoryApi'

const ev = (
  id: string,
  at: string,
  kind: TrajectoryKind = 'material',
  atAccuracy: 'exact' | 'approx' = 'exact'
): TrajectoryEvent => ({
  id,
  kind,
  at,
  atAccuracy,
  title: `事件 ${id}`,
  source: { table: 't', id },
  href: null,
})

const ids = (events: TrajectoryEvent[]) => toCanvasNodes(events).map((n) => n.event.id)
const topOf = (events: TrajectoryEvent[], id: string) =>
  toCanvasNodes(events).find((n) => n.event.id === id)?.top

describe('缩放档位（LOD）', () => {
  /**
   * ⚠️ 分界点是**公开契约**：界面上的文案、节点的行数、hover 给不给都为它服务。
   * 所以这里写死数字，不引用模块自己的常量 —— 改了常量就该有测试亮红灯，
   * 而不是测试跟着一起改（那样等于没有测试）。
   */
  it('两处分界点是对外承诺的数值', () => {
    expect(lodFor(0.549)).toBe('far')
    expect(lodFor(0.55)).toBe('mid')
    expect(lodFor(1.299)).toBe('mid')
    expect(lodFor(1.3)).toBe('near')
  })

  it('三档各自的基本情况', () => {
    expect(lodFor(0.25)).toBe('far')
    expect(lodFor(1)).toBe('mid')
    expect(lodFor(2)).toBe('near')
  })

  it('缩到 0 或负数还是"远"，不会算出别的档', () => {
    expect(lodFor(0)).toBe('far')
    expect(lodFor(-1)).toBe('far')
  })

  /**
   * `NaN` 比大小恒为 false ⇒ 不单独挡掉的话它会一路掉到 `near`，
   * 于是"画布刚坏掉"的那一帧反而画出最重的一档。
   */
  it('scale 是 NaN 时兜底到中档，不掉到最重那一档', () => {
    expect(lodFor(Number.NaN)).toBe('mid')
    expect(lodFor(Number.POSITIVE_INFINITY)).toBe('mid')
  })
})

describe('画布摆位（toCanvasNodes）', () => {
  const cluster = [
    ev('newest', '2026-03-01T00:00:00Z'),
    ev('middle', '2026-02-28T23:50:00Z'),
    ev('oldest', '2026-01-01T00:00:00Z'),
  ]

  it('空空间摆出空图（不是一条占位）', () => {
    expect(toCanvasNodes([])).toEqual([])
  })

  /** 原点就是"现在" —— 「回到原点」和「回到现在」是同一件事，靠的就是这条。 */
  it('最新的一条落在原点 y=0', () => {
    expect(topOf(cluster, 'newest')).toBe(0)
  })

  it('从新到旧排下来，越老 y 越大', () => {
    expect(ids(cluster)).toEqual(['newest', 'middle', 'oldest'])
    const [a, b, c] = ids(cluster).map((id) => topOf(cluster, id) as number)
    expect(a).toBeLessThan(b)
    expect(b).toBeLessThan(c)
  })

  /** 确定性的第一半：入参顺序不该影响任何坐标。 */
  it('打乱入参顺序，坐标一个都不变', () => {
    const shuffled = [cluster[2], cluster[0], cluster[1]]
    expect(toCanvasNodes(shuffled)).toEqual(toCanvasNodes(cluster))
  })

  /** 确定性的第二半：纯函数，连调两次结果相同。 */
  it('连调两次结果相同（不读时钟、不带随机）', () => {
    expect(toCanvasNodes(cluster)).toEqual(toCanvasNodes(cluster))
  })

  /**
   * 「挤在一起」必须是**相对**的：下面这四条全落在 90 秒里，但整段跨度是三个月，
   * 所以按比例它们该挤成一点 —— 挤成一点就叠住了，所以往下推，一格一格排。
   */
  it('挤在一起的那几天不会叠成一团', () => {
    const crowded = [
      ev('far', '2026-06-01T00:00:00Z'), // 三个月没动静之后回来的那次
      ev('a', '2026-03-01T00:00:00Z'),
      ev('b', '2026-03-01T00:00:30Z'),
      ev('c', '2026-03-01T00:01:00Z'),
      ev('d', '2026-03-01T00:01:30Z'),
    ]
    const tops = new Map(toCanvasNodes(crowded).map((n) => [n.event.id, n.top]))
    expect(tops.get('far')).toBe(0)
    // 新在上：d 最新 ⇒ 最靠上，然后依次往下，每格正好一格
    expect(tops.get('d')).toBe(TIME_HEIGHT)
    expect(tops.get('c')).toBe(TIME_HEIGHT + NODE_ROW_H)
    expect(tops.get('b')).toBe(TIME_HEIGHT + NODE_ROW_H * 2)
    expect(tops.get('a')).toBe(TIME_HEIGHT + NODE_ROW_H * 3)
  })

  /** 任何两点的间距 ≥ 一格 —— 这是"不重叠"的形式化版本，对任意输入都要成立。 */
  it('任意两点的间距都不小于一格', () => {
    const messy = [
      ev('a', '2026-01-01T00:00:00Z'),
      ev('b', '2026-01-01T00:00:01Z'),
      ev('c', '2026-01-01T00:00:02Z'),
      ev('d', '2026-06-01T00:00:00Z'),
      ev('e', '2026-06-01T00:00:01Z'),
      ev('f', '2026-12-01T00:00:00Z'),
    ]
    const tops = toCanvasNodes(messy).map((n) => n.top)
    for (let i = 1; i < tops.length; i += 1) {
      expect(tops[i] - tops[i - 1]).toBeGreaterThanOrEqual(NODE_ROW_H)
    }
  })

  /**
   * 纵向是**时间**，不是"第几条"。所以中间空出来的那段必须真的空出来 ——
   * 「我歇了两个月」是这张图上最该被看见的一件事。
   */
  it('中间的大空档真的空出一大段（图上看得出来）', () => {
    const gap = topOf(cluster, 'oldest')! - topOf(cluster, 'middle')!
    expect(gap).toBeGreaterThan(NODE_ROW_H)
    // 空档占整段的比例 ≈ 空白本身占的比例（59 天里空 58 天）
    expect(gap).toBeGreaterThan(TIME_HEIGHT * 0.8)
  })

  it('全部落在同一时刻时仍然各占一格', () => {
    const same = [ev('a', '2026-01-01T00:00:00Z'), ev('b', '2026-01-01T00:00:00Z')]
    expect(toCanvasNodes(same).map((n) => n.top)).toEqual([0, NODE_ROW_H])
  })

  /**
   * ⚠️ 时间读不出来时最危险的做法是"当成今天"（会挤到最新一条旁边）或"丢掉"（隐藏数据问题）。
   * 这一条同时钉住三件事：排最后、打标记、**不污染其它节点的坐标**。
   */
  it('时间坏掉的那条排在最后、被打上 timeless、且不影响别人', () => {
    const withBad = [...cluster, ev('broken', '不是时间')]
    const nodes = toCanvasNodes(withBad)

    expect(nodes.map((n) => n.event.id)).toEqual(['newest', 'middle', 'oldest', 'broken'])
    expect(nodes.find((n) => n.event.id === 'broken')?.timeless).toBe(true)
    expect(nodes.filter((n) => !n.timeless).map((n) => n.top)).toEqual(
      toCanvasNodes(cluster).map((n) => n.top)
    )
    // 而且它自己也要有个真数字 —— NaN 会让它连同后面的一起消失
    expect(topOf(withBad, 'broken')).toBeGreaterThan(topOf(cluster, 'oldest')!)
  })

  it('全部时间都坏掉时，还是从原点往下排，不出现 NaN', () => {
    const allBad = [ev('x', '--'), ev('y', '')]
    expect(toCanvasNodes(allBad).map((n) => n.top)).toEqual([0, NODE_ROW_H])
  })
})
