import type { CourseOutline } from '@/features/coursePlanner/outline/types'

// [sandbox] 「知识地图与课表」方案对比用的样例：4 章 / 7 单元 / 15 课 / 31 个知识点。
// 单元大多是 2～3 节课，只有一个单元是 1 节。覆盖了需要单独处理的几种情况：
// 已在其他课学过的知识点、跨多层的先后关系，以及一个不与任何节点相连的知识点。

export const courseOutlineSampleTitle = '微积分速成：核心概念与应用基础'

export const courseOutlineSample: CourseOutline = {
  knowledgePoints: [
    { id: 'function', name: '函数与映射', learnedIn: '高中数学衔接' },
    { id: 'domain', name: '定义域与值域', learnedIn: '高中数学衔接' },
    { id: 'graph', name: '函数图像与变换', learnedIn: '高中数学衔接' },
    { id: 'composite', name: '复合函数' },
    { id: 'notation', name: '常用数学记号' },
    { id: 'interval', name: '区间与邻域' },
    { id: 'limit', name: '极限的直观含义' },
    { id: 'one-sided', name: '左右极限' },
    { id: 'infinitesimal', name: '无穷大与无穷小' },
    { id: 'asymptote', name: '渐近线' },
    { id: 'limit-laws', name: '极限运算法则' },
    { id: 'squeeze', name: '夹逼定理' },
    { id: 'important-limits', name: '两个重要极限' },
    { id: 'equivalent', name: '等价无穷小替换' },
    { id: 'continuity', name: '连续性' },
    { id: 'discontinuity', name: '间断点的类型' },
    { id: 'ivt', name: '介值定理' },
    { id: 'rate', name: '平均变化率', learnedIn: '大学物理入门' },
    { id: 'derivative', name: '导数的定义' },
    { id: 'tangent', name: '切线与几何意义' },
    { id: 'differentiability', name: '可导与连续' },
    { id: 'rules', name: '基本求导法则' },
    { id: 'product-rule', name: '乘积与商的求导' },
    { id: 'chain', name: '链式法则' },
    { id: 'implicit', name: '隐函数求导' },
    { id: 'extrema', name: '单调性与极值' },
    { id: 'optimization', name: '最值与优化' },
    { id: 'riemann', name: '黎曼和' },
    { id: 'integral', name: '定积分' },
    { id: 'antiderivative', name: '原函数与不定积分' },
    { id: 'ftc', name: '微积分基本定理' },
  ],
  prerequisites: [
    { from: 'function', to: 'domain' },
    { from: 'function', to: 'graph' },
    { from: 'function', to: 'composite' },
    { from: 'function', to: 'limit' },
    { from: 'interval', to: 'limit' },
    { from: 'limit', to: 'one-sided' },
    { from: 'limit', to: 'infinitesimal' },
    { from: 'infinitesimal', to: 'asymptote' },
    { from: 'graph', to: 'asymptote' },
    { from: 'limit', to: 'limit-laws' },
    { from: 'limit-laws', to: 'squeeze' },
    { from: 'squeeze', to: 'important-limits' },
    { from: 'infinitesimal', to: 'equivalent' },
    { from: 'important-limits', to: 'equivalent' },
    { from: 'one-sided', to: 'continuity' },
    { from: 'limit-laws', to: 'continuity' },
    { from: 'continuity', to: 'discontinuity' },
    { from: 'continuity', to: 'ivt' },
    { from: 'function', to: 'rate' },
    { from: 'rate', to: 'derivative' },
    { from: 'limit-laws', to: 'derivative' },
    { from: 'derivative', to: 'tangent' },
    { from: 'graph', to: 'tangent' },
    { from: 'derivative', to: 'differentiability' },
    { from: 'continuity', to: 'differentiability' },
    { from: 'derivative', to: 'rules' },
    { from: 'rules', to: 'product-rule' },
    { from: 'rules', to: 'chain' },
    { from: 'composite', to: 'chain' },
    { from: 'chain', to: 'implicit' },
    { from: 'rules', to: 'extrema' },
    { from: 'continuity', to: 'extrema' },
    { from: 'extrema', to: 'optimization' },
    { from: 'limit', to: 'riemann' },
    { from: 'riemann', to: 'integral' },
    { from: 'continuity', to: 'integral' },
    { from: 'rules', to: 'antiderivative' },
    { from: 'integral', to: 'ftc' },
    { from: 'antiderivative', to: 'ftc' },
  ],
  chapters: [
    {
      id: 'chapter-prep',
      title: '预备章：函数与记号',
      units: [
        {
          id: 'unit-prep-function',
          title: '第一单元：函数与图像',
          lessons: [
            {
              id: 'lesson-function',
              number: 1,
              title: '函数是什么',
              knowledgePointIds: ['function', 'domain'],
            },
            {
              id: 'lesson-graph',
              number: 2,
              title: '图像与复合',
              knowledgePointIds: ['graph', 'composite'],
            },
          ],
        },
        {
          id: 'unit-prep-language',
          title: '第二单元：数学语言热身',
          lessons: [
            {
              id: 'lesson-language',
              number: 3,
              title: '读懂数学语言',
              knowledgePointIds: ['notation', 'interval'],
            },
          ],
        },
      ],
    },
    {
      id: 'chapter-limit',
      title: '第一章：极限——微积分的基石',
      units: [
        {
          id: 'unit-limit-idea',
          title: '第一单元：什么是极限？',
          lessons: [
            {
              id: 'lesson-limit-idea',
              number: 4,
              title: '从逼近到极限',
              knowledgePointIds: ['limit', 'one-sided'],
            },
            {
              id: 'lesson-limit-infinity',
              number: 5,
              title: '无穷与渐近线',
              knowledgePointIds: ['infinitesimal', 'asymptote'],
            },
          ],
        },
        {
          id: 'unit-limit-laws',
          title: '第二单元：极限的运算法则与连续性',
          lessons: [
            {
              id: 'lesson-limit-laws',
              number: 6,
              title: '极限怎么算',
              knowledgePointIds: ['limit-laws', 'squeeze'],
            },
            {
              id: 'lesson-important-limits',
              number: 7,
              title: '两个重要极限',
              knowledgePointIds: ['important-limits', 'equivalent'],
            },
            {
              id: 'lesson-continuity',
              number: 8,
              title: '连续与间断',
              knowledgePointIds: ['continuity', 'discontinuity', 'ivt'],
            },
          ],
        },
      ],
    },
    {
      id: 'chapter-derivative',
      title: '第二章：导数——变化率的量化',
      units: [
        {
          id: 'unit-derivative-definition',
          title: '第一单元：导数的定义',
          lessons: [
            {
              id: 'lesson-derivative-definition',
              number: 9,
              title: '从平均到瞬时',
              knowledgePointIds: ['rate', 'derivative'],
            },
            {
              id: 'lesson-derivative-geometry',
              number: 10,
              title: '导数的几何意义',
              knowledgePointIds: ['tangent', 'differentiability'],
            },
          ],
        },
        {
          id: 'unit-derivative-rules',
          title: '第二单元：求导法则与应用',
          lessons: [
            {
              id: 'lesson-derivative-rules',
              number: 11,
              title: '求导法则',
              knowledgePointIds: ['rules', 'product-rule'],
            },
            {
              id: 'lesson-derivative-chain',
              number: 12,
              title: '复合函数求导',
              knowledgePointIds: ['chain', 'implicit'],
            },
            {
              id: 'lesson-derivative-shape',
              number: 13,
              title: '用导数看函数',
              knowledgePointIds: ['extrema', 'optimization'],
            },
          ],
        },
      ],
    },
    {
      id: 'chapter-integral',
      title: '第三章：积分——累积的度量',
      units: [
        {
          id: 'unit-integral',
          title: '第一单元：定积分与微积分基本定理',
          lessons: [
            {
              id: 'lesson-integral',
              number: 14,
              title: '面积与累积',
              knowledgePointIds: ['riemann', 'integral'],
            },
            {
              id: 'lesson-ftc',
              number: 15,
              title: '微积分基本定理',
              knowledgePointIds: ['antiderivative', 'ftc'],
            },
          ],
        },
      ],
    },
  ],
}
