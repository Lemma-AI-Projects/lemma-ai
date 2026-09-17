import type { CourseOverviewData } from '@/features/courseOverview/types'

export const courseOverviewMock: CourseOverviewData = {
  id: 'calculus-introduction',
  title: '微积分入门与核心概念精讲',
  description:
    '本课程从极限与连续这一数学分析的基础出发，逐步建立一元函数微积分的完整知识体系。你将系统学习函数极限、连续性、导数与微分、中值定理、定积分与不定积分等核心内容，并进一步探索导数与积分在函数性质分析、极值与最优化、曲线研究、面积与体积计算等问题中的典型应用。',
  chapters: [
    {
      id: 'limits',
      ordinalLabel: '一',
      label: '1',
      title: '函数极限与连续性',
      summary:
        '本章先用数列极限建立“无限接近”的直观，再过渡到函数极限的严格定义，掌握极限的四则运算、夹逼准则与两个重要极限。随后讨论连续性与间断点的分类，理解闭区间上连续函数的性质，为后续导数与积分的学习打下基础。',
      progress: 100,
      units: [
        {
          id: 'limit-basics',
          label: '1',
          title: '数列与函数极限',
          progress: 100,
          quizProgress: 80,
          card: {
            title: '第一单元：数列与函数极限',
            summary:
              '从数列极限认识“无限接近”，再把同一套语言推广到函数极限。',
            points: [
              {
                id: 'limit-basics-point-1',
                title: '数列极限与收敛判别',
                completed: true,
              },
              {
                id: 'limit-basics-point-2',
                title: '函数极限的定义与左右极限',
                completed: true,
              },
              {
                id: 'limit-basics-point-3',
                title: '极限的四则运算与夹逼准则',
                completed: false,
              },
            ],
          },
        },
        {
          id: 'continuity',
          label: '2',
          title: '连续性与间断点',
          progress: 40,
          quizProgress: 45,
          card: {
            title: '第二单元：连续性与间断点',
            summary: '用极限刻画连续性，并理解闭区间上连续函数的整体性质。',
            points: [
              {
                id: 'continuity-point-1',
                title: '连续的定义与间断点分类',
                completed: false,
              },
              {
                id: 'continuity-point-2',
                title: '初等函数的连续性',
                completed: false,
              },
              {
                id: 'continuity-point-3',
                title: '闭区间上连续函数的性质',
                completed: false,
              },
            ],
          },
        },
        {
          id: 'limits-assessment',
          label: '3',
          title: '综合评估：极限与分析基础',
          progress: 0,
          quizProgress: 0,
          card: {
            title: '综合评估：极限与分析基础',
            summary:
              '对本章做一次整体检验：极限计算与连续性判断的综合运用，用一套贯通题目定位薄弱环节。',
            points: [
              {
                id: 'limits-assessment-point-1',
                title: '第一章 综合评估：极限与分析基础',
                completed: false,
                practiceOnly: true,
              },
            ],
          },
        },
      ],
    },
    {
      id: 'derivatives',
      ordinalLabel: '二',
      label: '2',
      title: '导数与微分',
      summary:
        '本章从平均变化率走到瞬时变化率，用极限给出导数的严格定义，并理解切线、瞬时速度等几何与物理含义。随后建立基本求导公式与四则、复合、隐函数等运算法则，引入微分概念及其在近似计算中的应用。',
      progress: 60,
      units: [
        {
          id: 'derivative-definition',
          label: '1',
          title: '导数的定义与几何意义',
          progress: 80,
          quizProgress: 50,
          card: {
            title: '第一单元：导数的定义与几何意义',
            summary:
              '用极限刻画瞬时变化率，理解导数、切线与可导性之间的关系。',
            points: [
              {
                id: 'derivative-definition-point-1',
                title: '平均变化率与瞬时变化率',
                completed: true,
              },
              {
                id: 'derivative-definition-point-2',
                title: '导数的定义与可导性',
                completed: true,
              },
              {
                id: 'derivative-definition-point-3',
                title: '切线方程与导数的几何意义',
                completed: false,
              },
            ],
          },
        },
        {
          id: 'derivative-rules',
          label: '2',
          title: '求导法则与微分',
          progress: 40,
          quizProgress: 20,
          card: {
            title: '第二单元：求导法则与微分',
            summary:
              '掌握基本求导公式、复合函数求导，以及微分在近似计算中的用法。',
            points: [
              {
                id: 'derivative-rules-point-1',
                title: '基本求导公式与四则运算法则',
                completed: true,
              },
              {
                id: 'derivative-rules-point-2',
                title: '复合函数、隐函数与参数方程求导',
                completed: false,
              },
              {
                id: 'derivative-rules-point-3',
                title: '微分及其在近似计算中的应用',
                completed: false,
              },
            ],
          },
        },
        {
          id: 'derivatives-assessment',
          label: '3',
          title: '综合评估：导数与微分',
          progress: 0,
          quizProgress: 0,
          card: {
            title: '综合评估：导数与微分',
            summary:
              '对本专题做一次整体检验：导数计算、切线问题与微分近似的综合运用。',
            points: [
              {
                id: 'derivatives-assessment-point-1',
                title: '第二章 综合评估：导数与微分',
                completed: false,
                practiceOnly: true,
              },
            ],
          },
        },
      ],
    },
    {
      id: 'mean-value',
      ordinalLabel: '三',
      label: '3',
      title: '微分中值定理',
      summary:
        '本章用中值定理把导数与函数的整体性质连接起来：从罗尔定理、拉格朗日定理出发，理解函数在区间上的平均变化与瞬时变化的关系。随后用导数研究单调性、极值、凹凸性，并用洛必达法则处理常见未定式。',
      progress: 25,
      units: [
        {
          id: 'mean-value-theorems',
          label: '1',
          title: '中值定理与洛必达法则',
          progress: 35,
          quizProgress: 10,
          card: {
            title: '第一单元：中值定理与洛必达法则',
            summary:
              '从罗尔、拉格朗日定理出发，理解导数如何控制函数在区间上的整体变化。',
            points: [
              {
                id: 'mean-value-theorems-point-1',
                title: '罗尔定理与拉格朗日中值定理',
                completed: false,
              },
              {
                id: 'mean-value-theorems-point-2',
                title: '柯西中值定理与洛必达法则',
                completed: false,
              },
              {
                id: 'mean-value-theorems-point-3',
                title: '泰勒公式与余项估计',
                completed: false,
              },
            ],
          },
        },
        {
          id: 'derivative-applications',
          label: '2',
          title: '函数性态与极值',
          progress: 15,
          quizProgress: 0,
          card: {
            title: '第二单元：函数性态与极值',
            summary:
              '用一阶、二阶导数判断单调性、极值与凹凸性，完成函数图像的基本分析。',
            points: [
              {
                id: 'derivative-applications-point-1',
                title: '单调性与极值的一阶判别法',
                completed: false,
              },
              {
                id: 'derivative-applications-point-2',
                title: '凹凸性、拐点与二阶判别法',
                completed: false,
              },
              {
                id: 'derivative-applications-point-3',
                title: '函数作图与最优化问题',
                completed: false,
              },
            ],
          },
        },
        {
          id: 'mean-value-assessment',
          label: '3',
          title: '综合评估：中值定理与导数应用',
          progress: 0,
          quizProgress: 0,
          card: {
            title: '综合评估：中值定理与导数应用',
            summary:
              '对本专题做一次整体检验：中值定理、洛必达法则与函数性态分析的综合运用。',
            points: [
              {
                id: 'mean-value-assessment-point-1',
                title: '第三章 综合评估：中值定理与导数应用',
                completed: false,
                practiceOnly: true,
              },
            ],
          },
        },
      ],
    },
    {
      id: 'indefinite-integral',
      ordinalLabel: '四',
      label: '4',
      title: '不定积分',
      summary:
        '本章把求导反过来看：从原函数出发理解不定积分的含义与基本性质，建立基本积分公式表。随后掌握换元积分法与分部积分法，处理常见初等函数的不定积分计算。',
      progress: 0,
      units: [
        {
          id: 'antiderivative',
          label: '1',
          title: '原函数与基本积分公式',
          progress: 0,
          quizProgress: 0,
          card: {
            title: '第一单元：原函数与基本积分公式',
            summary:
              '理解原函数与不定积分的关系，并熟练使用基本积分公式。',
            points: [
              {
                id: 'antiderivative-point-1',
                title: '原函数的定义与存在性',
                completed: false,
              },
              {
                id: 'antiderivative-point-2',
                title: '不定积分的性质与基本公式',
                completed: false,
              },
              {
                id: 'antiderivative-point-3',
                title: '直接积分法与常见变形',
                completed: false,
              },
            ],
          },
        },
        {
          id: 'integration-techniques',
          label: '2',
          title: '换元与分部积分',
          progress: 0,
          quizProgress: 0,
          card: {
            title: '第二单元：换元与分部积分',
            summary:
              '用第一、第二换元法和分部积分法处理更复杂的不定积分。',
            points: [
              {
                id: 'integration-techniques-point-1',
                title: '第一换元法与凑微分',
                completed: false,
              },
              {
                id: 'integration-techniques-point-2',
                title: '第二换元法与三角代换',
                completed: false,
              },
              {
                id: 'integration-techniques-point-3',
                title: '分部积分法与递推公式',
                completed: false,
              },
            ],
          },
        },
        {
          id: 'indefinite-integral-assessment',
          label: '3',
          title: '综合评估：不定积分',
          progress: 0,
          quizProgress: 0,
          card: {
            title: '综合评估：不定积分',
            summary:
              '对本专题做一次整体检验：基本积分、换元法与分部积分的综合运用。',
            points: [
              {
                id: 'indefinite-integral-assessment-point-1',
                title: '第四章 综合评估：不定积分',
                completed: false,
                practiceOnly: true,
              },
            ],
          },
        },
      ],
    },
    {
      id: 'definite-integral',
      ordinalLabel: '五',
      label: '5',
      title: '定积分及其应用',
      summary:
        '本章从面积问题引入定积分，理解分割、近似、求和与取极限的过程。随后建立牛顿—莱布尼茨公式，把定积分计算落到原函数上，并用定积分处理平面图形面积、旋转体体积等典型应用。',
      progress: 0,
      units: [
        {
          id: 'definite-integral-definition',
          label: '1',
          title: '定积分的定义与性质',
          progress: 0,
          quizProgress: 0,
          card: {
            title: '第一单元：定积分的定义与性质',
            summary:
              '从曲边梯形的面积出发，理解定积分的定义、几何意义与基本性质。',
            points: [
              {
                id: 'definite-integral-definition-point-1',
                title: '分割求和与定积分的定义',
                completed: false,
              },
              {
                id: 'definite-integral-definition-point-2',
                title: '可积条件与定积分的几何意义',
                completed: false,
              },
              {
                id: 'definite-integral-definition-point-3',
                title: '定积分的性质与中值定理',
                completed: false,
              },
            ],
          },
        },
        {
          id: 'fundamental-theorem',
          label: '2',
          title: '微积分基本定理与应用',
          progress: 0,
          quizProgress: 0,
          card: {
            title: '第二单元：微积分基本定理与应用',
            summary:
              '用牛顿—莱布尼茨公式计算定积分，并解决面积、体积等累积量问题。',
            points: [
              {
                id: 'fundamental-theorem-point-1',
                title: '变上限积分与微积分基本定理',
                completed: false,
              },
              {
                id: 'fundamental-theorem-point-2',
                title: '牛顿—莱布尼茨公式与定积分计算',
                completed: false,
              },
              {
                id: 'fundamental-theorem-point-3',
                title: '平面图形面积与旋转体体积',
                completed: false,
              },
            ],
          },
        },
        {
          id: 'definite-integral-assessment',
          label: '3',
          title: '综合评估：定积分及其应用',
          progress: 0,
          quizProgress: 0,
          card: {
            title: '综合评估：定积分及其应用',
            summary:
              '对本专题做一次整体检验：定积分计算、基本定理与几何应用的综合运用。',
            points: [
              {
                id: 'definite-integral-assessment-point-1',
                title: '第五章 综合评估：定积分及其应用',
                completed: false,
                practiceOnly: true,
              },
            ],
          },
        },
      ],
    },
  ],
}
