// 输入框 Sandbox 用的示例数据：今日任务、学习空间和可以附上的资料都还没有接后端。
export const composerTodayTasks = [
  { id: 'today-1', title: '特征值分解', progress: 25 },
  { id: 'today-2', title: '分部积分小测', progress: 40 },
  { id: 'today-3', title: 'Python 第 5 章练习', progress: 0 },
  { id: 'today-4', title: '英语晨读', progress: 100 },
]

export const composerSpaces = [
  { id: 'space-1', name: '高一上' },
  { id: 'space-2', name: '竞赛准备' },
]

// 可以附到对话上的平台资料，按来源分开。条目故意放得多一些，用来看列表滚动和搜索。
function attachmentItems(prefix: string, titles: string[]) {
  return titles.map((title, index) => ({ id: `${prefix}-${index + 1}`, title }))
}

export const composerAttachmentLibrary = {
  course: attachmentItems('course', [
    '微积分速成',
    '线性代数入门',
    'Python 基础',
    '概率论与数理统计',
    '高中物理：力学',
    '英语语法精讲',
    '离散数学',
    '数据结构与算法',
    '有机化学基础',
    '世界近代史',
    '机器学习导论',
    '托福阅读强化',
  ]),
  'question-set': attachmentItems('set', [
    '分部积分小测',
    '线性代数期中模拟卷',
    'Python 第 5 章练习',
    '极限与连续错题重做',
    '导数应用专项练习',
    '矩阵运算小测',
    '概率分布单元卷',
    '牛顿运动定律练习',
    '定语从句专项',
    '二叉树遍历练习',
    '排序算法小测',
    '化学方程式配平练习',
    '期末综合模拟卷（一）',
    '期末综合模拟卷（二）',
  ]),
  schedule: attachmentItems('schedule', [
    '今天的任务',
    '本周排期',
    '下周排期',
    '本月排期',
    '全部排期',
    '微积分速成的排期',
    '线性代数入门的排期',
    'Python 基础的排期',
    '期末复习排期',
  ]),
  knowledge: attachmentItems('kb', [
    '高数错题整理.pdf',
    '课堂笔记 第 3 周.docx',
    'SecDecoding_中文译稿.md',
    '线性代数公式表.pdf',
    '期末复习提纲.docx',
    '实验报告模板.docx',
    '物理竞赛真题汇编.pdf',
    '英语作文素材.md',
    '数据结构课件 第 7 讲.pptx',
    '概率论习题解答.pdf',
    '读书笔记：思考，快与慢.md',
    '化学元素周期表.png',
    '成绩单 2026 春.xlsx',
    '托福词汇表.csv',
  ]),
}
