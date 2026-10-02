import { describe, expect, it } from 'vitest'

import {
  PURPOSE_LABELS,
  USER_CLOSE_OPTIONS,
  daysUntil,
  describeDeadline,
  formatDeadline,
  goalLine,
  restateGoal,
  restateLocalDraft,
} from './goalText'
import type { GoalPurpose, SpaceGoal } from './types'

const NOW = new Date('2026-10-02T10:00:00+08:00')

function goal(overrides: Partial<SpaceGoal> = {}): SpaceGoal {
  return {
    id: 'g1',
    projectId: 'p1',
    targetText: '考到 TOEFL 117 分',
    deadlineAt: '2026-12-02T00:00:00+08:00',
    context: 'TOEFL',
    purpose: 'exam_performance',
    origin: 'user_entered',
    status: 'active',
    confirmedAt: '2026-10-02T09:00:00+08:00',
    closedReason: null,
    outcomeKind: 'externally_reported',
    createdAt: '2026-10-02T09:00:00+08:00',
    updatedAt: '2026-10-02T09:00:00+08:00',
    ...overrides,
  }
}

describe('天数按自然日算', () => {
  it('今天 0、明天 1、两个月后 61', () => {
    expect(daysUntil('2026-10-02T23:00:00+08:00', NOW)).toBe(0)
    expect(daysUntil('2026-10-03T00:30:00+08:00', NOW)).toBe(1)
    expect(daysUntil('2026-12-02T00:00:00+08:00', NOW)).toBe(61)
  })

  it('过了的就是负数，不是 0', () => {
    expect(daysUntil('2026-09-29T00:00:00+08:00', NOW)).toBe(-3)
  })

  it('没有日期 / 日期读不出来 ⇒ null（不猜 0）', () => {
    expect(daysUntil(null, NOW)).toBeNull()
    expect(daysUntil('不是日期', NOW)).toBeNull()
  })

  it('一句话里没有数字也不影响 —— 只有日期，没有进度', () => {
    expect(describeDeadline(null, NOW)).toBeNull()
    expect(describeDeadline('2026-10-02T08:00:00+08:00', NOW)).toBe('今天')
    expect(describeDeadline('2026-10-03T08:00:00+08:00', NOW)).toBe('明天')
    expect(describeDeadline('2026-12-02T00:00:00+08:00', NOW)).toBe('还有 61 天')
    expect(describeDeadline('2026-09-29T00:00:00+08:00', NOW)).toBe('已过期 3 天')
  })

  it('把日期说清（详情里要指得出那一天）', () => {
    expect(formatDeadline('2026-12-02T00:00:00+08:00')).toBe('2026年12月2日')
    expect(formatDeadline(null)).toBeNull()
  })
})

describe('顶栏那一行方位', () => {
  it('目标 + 时间', () => {
    expect(goalLine(goal(), NOW)).toBe('考到 TOEFL 117 分 · 还有 61 天')
  })

  it('没有截止日期就只说目标 —— 不编一个时间', () => {
    expect(goalLine(goal({ deadlineAt: null }), NOW)).toBe('考到 TOEFL 117 分')
  })

  it('没有目标 ⇒ null（顶栏什么都不加）', () => {
    expect(goalLine(null, NOW)).toBeNull()
    expect(goalLine(goal({ targetText: '   ' }), NOW)).toBeNull()
  })
})

describe('回述句由字段拼出来', () => {
  it('四样都有就说四样', () => {
    expect(
      restateGoal({
        targetText: '考到 TOEFL 117 分',
        deadlineAt: '2026-12-02T00:00:00+08:00',
        context: 'TOEFL',
        purpose: 'exam_performance',
      })
    ).toBe('目标是「考到 TOEFL 117 分」，2026年12月2日之前，在「TOEFL」这件事上，为了考出成绩。')
  })

  it('只有一句话时也不啰嗦', () => {
    expect(restateGoal({ targetText: '真正学懂线性代数' })).toBe(
      '目标是「真正学懂线性代数」。'
    )
  })

  it('什么都没有 ⇒ 空串（页面据此不渲染这张卡）', () => {
    expect(restateGoal({ targetText: '  ' })).toBe('')
  })
})

describe('编辑器草稿 → 回述句（字段名不一样，这一处映射要钉住）', () => {
  it('date-only 的截止日期也要出现在句子里', () => {
    // 离屏断言抓到过一次：`deadline` 与 `deadlineAt` 名字像、类型不同，直接传过去
    // 不报错，只会静默丢掉日期 —— 回述句里"…之前"整段不见了。
    expect(
      restateLocalDraft({
        targetText: '考到 TOEFL 117 分',
        deadline: '2026-12-02',
        context: 'TOEFL',
        purpose: 'exam_performance',
      })
    ).toContain('2026年12月2日之前')
  })

  it('草稿里日期是空串 ⇒ 句子里就不说时间', () => {
    expect(
      restateLocalDraft({
        targetText: '真正学懂线性代数',
        deadline: '',
        context: '',
        purpose: 'understanding',
      })
    ).toBe('目标是「真正学懂线性代数」，为了真正理解。')
  })
})

describe('词表是齐的', () => {
  it('每一个 purpose 都有一句人话', () => {
    const purposes: GoalPurpose[] = [
      'exam_performance',
      'understanding',
      'build_something',
      'other',
    ]
    for (const purpose of purposes) {
      expect(PURPOSE_LABELS[purpose]).toBeTruthy()
    }
  })

  it('关闭的理由全是 user_* —— 界面上只有学习者能关目标', () => {
    for (const option of USER_CLOSE_OPTIONS) {
      expect(option.reason.startsWith('user_')).toBe(true)
      expect(option.label).toBeTruthy()
    }
  })
})
