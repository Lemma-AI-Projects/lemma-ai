import type { ConversationSourceMessage } from '@/features/conversation/createConversationTurns'
import type { QuestionnaireQuestion } from '@/features/conversation/questionnaire/questionnaire'
import { chatSandboxMessages } from '@/mock/chatSandboxMessages'

// 问卷 Sandbox 用的示例数据：问卷还没有后端契约。

// 问卷出现之前的对话：沿用 Chat Sandbox 里那段讲二分查找的对话，末尾接上「先回答几个问题」。
export const questionnaireSandboxMessages: ConversationSourceMessage[] = [
  ...chatSandboxMessages,
  {
    role: 'user',
    date: '2025-01-01T09:01:00Z',
    message: '明白了。能给我安排一组练习吗？',
  },
  {
    role: 'assistant',
    date: '2025-01-01T09:01:06Z',
    message: '可以。先回答几个问题，我按你的情况来出题。',
  },
]

// 问卷提交之后助手的回应。
export const questionnaireSandboxReply = '收到，我按这些回答来准备练习。'

// 两份示例问卷，区别在最后一题是单选还是多选。
export type QuestionnaireSampleId = 'single-last' | 'multi-last'

export const questionnaireSandboxSamples: Record<
  QuestionnaireSampleId,
  QuestionnaireQuestion[]
> = {
  'single-last': [
    {
      id: 'current-level',
      title: '你目前对二分查找的掌握程度是？',
      options: [
        '刚入门',
        '理解思路，但边界常写错',
        '基础没问题，想练变形题',
        '已经很熟，想做综合题',
      ],
    },
    {
      id: 'focus-topics',
      title: '接下来想重点练哪几类问题？',
      multiple: true,
      options: [
        '基础模板与边界条件',
        '查找左右边界',
        '旋转数组里查找',
        '二分答案与单调性',
      ],
    },
    {
      id: 'practice-style',
      title: '练习的时候，你希望我怎么配合？',
      options: ['先讲两道例题再练', '边讲边练', '直接出题，做完再讲'],
    },
  ],
  'multi-last': [
    {
      id: 'language',
      title: '这组练习想用哪种语言来写？',
      options: ['Python', 'Java', 'C++'],
    },
    {
      id: 'mistakes',
      title: '做错的题，你希望怎么处理？',
      multiple: true,
      options: ['当场讲解', '记进错题本', '之后再出一道同类题'],
    },
  ],
}
