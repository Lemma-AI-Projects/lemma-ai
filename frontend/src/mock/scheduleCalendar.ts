import { addDays, isBefore, isSameDay, startOfDay, startOfWeek } from 'date-fns'

import type {
  CalendarCourse,
  CalendarTask,
} from '@/features/schedule/calendar/calendarTasks'

// 日程 Sandbox 用的示例数据：日历还没有接后端。
//
// 和产品的排课方式一致：每门课固定在每周的某几天学，一天一课，从某一周开始一路排下去。
// 日期都相对「今天」生成，所以哪天打开，今天前后都有内容。
interface CourseSample {
  id: string
  name: string
  // 每周哪几天学，周一为 0。
  weekdays: number[]
  // 从哪一周开始，相对本周：-4 是四周前，1 是下周。
  startWeek: number
  lessons: string[]
}

const COURSE_SAMPLES: CourseSample[] = [
  {
    id: 'calculus',
    name: '微积分速成',
    weekdays: [0, 2, 4],
    startWeek: -4,
    lessons: [
      '函数与极限',
      '极限的运算法则',
      '两个重要极限',
      '连续性与间断点',
      '导数的定义',
      '求导法则',
      '链式法则',
      '隐函数求导',
      '单调性与极值',
      '最值与优化',
      '不定积分',
      '换元积分法',
      '分部积分法',
      '定积分的概念',
      '微积分基本定理',
      '定积分的应用',
      '反常积分',
      '期末综合复习',
    ],
  },
  {
    id: 'linear-algebra',
    name: '线性代数入门',
    weekdays: [1, 3, 4],
    startWeek: -2,
    lessons: [
      '向量与线性组合',
      '矩阵乘法',
      '高斯消元',
      '逆矩阵',
      '行列式',
      '向量空间',
      '线性无关与基',
      '秩与零空间',
      '特征值分解',
      '线性变换',
      '正交与投影',
      '最小二乘',
      '对角化',
      '对称矩阵',
      '二次型',
      '奇异值分解',
      '期中模拟卷',
    ],
  },
  {
    id: 'python',
    name: 'Python 基础',
    weekdays: [0, 3, 5],
    startWeek: -1,
    lessons: [
      '变量与数据类型',
      '条件与循环',
      '函数',
      '列表与元组',
      '字典与集合',
      '第 5 章练习',
      '字符串处理',
      '文件读写',
      '异常处理',
      '模块与包',
      '类与对象',
      '继承与多态',
      '迭代器与生成器',
      '装饰器',
      '小项目：记账本',
    ],
  },
  {
    id: 'english',
    name: '英语语法精讲',
    weekdays: [1, 4, 6],
    startWeek: -3,
    lessons: [
      '时态综述',
      '现在完成时',
      '被动语态',
      '定语从句',
      '名词性从句',
      '状语从句',
      '非谓语动词',
      '虚拟语气',
      '倒装与强调',
      '主谓一致',
      '长难句拆解',
      '完形填空技巧',
      '阅读提速训练',
      '写作句式升级',
      '语法综合小测',
    ],
  },
  {
    id: 'probability',
    name: '概率论与数理统计',
    weekdays: [2, 4],
    startWeek: 1,
    lessons: [
      '随机事件与概率',
      '条件概率',
      '全概率与贝叶斯',
      '离散型随机变量',
      '连续型随机变量',
      '常见分布',
      '数学期望',
      '方差与协方差',
      '大数定律',
      '中心极限定理',
      '参数估计',
      '假设检验',
    ],
  },
]

// 0..99 的固定「随机」数：同一个种子永远得到同一个结果，刷新页面示例数据不会变。
function sampleNoise(seed: number): number {
  return (Math.imul(seed + 1, 2654435761) >>> 0) % 100
}

export function getScheduleCalendarSample(today: Date): {
  courses: CalendarCourse[]
  tasks: CalendarTask[]
} {
  const base = startOfDay(today)
  const monday = startOfWeek(base, { weekStartsOn: 1 })
  const tasks: CalendarTask[] = []

  COURSE_SAMPLES.forEach((course, courseIndex) => {
    course.lessons.forEach((title, lessonIndex) => {
      const week = course.startWeek + Math.floor(lessonIndex / course.weekdays.length)
      const weekday = course.weekdays[lessonIndex % course.weekdays.length]
      const date = addDays(monday, week * 7 + weekday)
      const noise = sampleNoise(courseIndex * 97 + lessonIndex * 13)
      const total = 3 + (noise % 3)

      // 过去的日子：大多做完了，少数做了一部分，个别没做。今天和以后的先都算没开始。
      let completed = 0
      if (isBefore(date, base)) {
        completed = noise < 78 ? total : noise < 91 ? 1 + (noise % (total - 1)) : 0
      }

      tasks.push({
        id: `${course.id}-${lessonIndex + 1}`,
        title,
        courseId: course.id,
        date,
        steps: { completed, total },
      })
    })
  })

  // 今天的几项：第一项做完了，第二项做到一半，其余还没开始。
  tasks
    .filter((task) => isSameDay(task.date, base))
    .forEach((task, index) => {
      const { total } = task.steps
      task.steps.completed = index === 0 ? total : index === 1 ? Math.ceil(total / 2) : 0
    })

  tasks.sort((a, b) => a.date.getTime() - b.date.getTime())

  return {
    courses: COURSE_SAMPLES.map(({ id, name }) => ({ id, name })),
    tasks,
  }
}
