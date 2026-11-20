import type { ConversationSourceMessage } from '@/features/conversation/createConversationTurns'
import type { ConversationToolQuestion } from '@/features/conversation/types'

export const chatSandboxMessages: ConversationSourceMessage[] = [
  {
    role: 'user',
    date: '2025-01-01T09:00:00Z',
    message: '我知道二分查找每次排除一半，但写 `left` 和 `right` 的更新时总是弄混。能用一个例子讲一下吗？',
  },
  {
    role: 'assistant',
    date: '2025-01-01T09:00:08Z',
    message: [
      '先约定一件事：**`left` 和 `right` 指向的两个位置都还没被排除。**',
      '在 `[2, 5, 8, 12, 16, 23, 38]` 里找 `16`，第一轮会看到中间的 `12`。数组已经排好序，所以 `12` 和它左边的数都可以排除。下一轮从 `mid + 1` 开始，右边界保持原样。',
      '- 中间值比目标小：`left = mid + 1`。\n- 中间值比目标大：`right = mid - 1`。\n- 中间值等于目标：找到，直接返回。',
    ].join('\n\n'),
  },
  {
    role: 'user',
    date: '2025-01-01T09:00:24Z',
    message: '那如果 `left` 和 `right` 指向同一个位置，还要再查一次吗？',
  },
  {
    role: 'assistant',
    date: '2025-01-01T09:00:31Z',
    message: '要。按刚才的约定，`left === right` 时还剩一个候选位置。所以循环条件是 **`left <= right`**，等到两条边界交错，也就是 `left > right`，才说明候选位置已经用完。',
  },
]

export const chatSandboxQuestionnaire: ConversationToolQuestion[] = [
  {
    id: 'current-level',
    title: '你目前对二分查找的掌握程度是？',
    options: ['刚入门', '理解思路但常写错边界', '想刷进阶变形题'],
  },
  {
    id: 'focus-topic',
    title: '接下来你想重点练习哪一类问题？',
    options: ['基础模板与边界条件', '查找左右边界', '二分答案与单调性'],
  },
  {
    id: 'practice-pace',
    title: '你希望接下来的学习节奏是？',
    options: ['先讲 2 道例题', '边讲边练', '直接开始综合测验'],
  },
]
