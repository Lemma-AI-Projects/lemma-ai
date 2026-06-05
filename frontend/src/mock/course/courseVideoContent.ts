export interface CourseVideoChapterSummary {
  id: string
  startTime: string
  title: string
  summary: string
}

export interface CourseVideoCopy {
  source: string
  author: string
  aiSummary: string
  chapterSummaries: CourseVideoChapterSummary[]
}

export const courseVideoContent: Record<string, CourseVideoCopy> = {
  'linear-algebra-lecture-12-unit-1-chapter-1': {
    source: 'MIT OpenCourseWare · Linear Algebra Lecture 12',
    author: 'Gilbert Strang',
    aiSummary:
      '本节用几何视角解释特征向量为什么重要：在线性变换中，大多数向量会被旋转到新的方向，而特征向量会保持在原来的直线上，只发生拉伸、压缩或翻转。理解这些稳定方向，可以帮助你把矩阵从一组数字转化为一个可解释的空间动作。',
    chapterSummaries: [
      {
        id: 'forest',
        startTime: '00:00',
        title: '建立直觉',
        summary:
          '从“稳定方向”的问题出发，说明为什么只看矩阵条目不够，需要观察变换如何作用在向量方向上。',
      },
      {
        id: 'camp-site',
        startTime: '01:13',
        title: '线性变换中的方向变化',
        summary:
          '对比普通向量和特殊向量在变换后的表现，引出“方向保持不变”这一核心现象。',
      },
      {
        id: 'sprites',
        startTime: '02:31',
        title: '特征向量的定义',
        summary:
          '把稳定方向形式化为 Av = λv，强调特征向量描述方向，特征值描述该方向上的缩放比例。',
      },
      {
        id: 'campfire',
        startTime: '03:57',
        title: '特征值的几何含义',
        summary:
          '解释 λ 的正负和大小如何对应拉伸、压缩或反向，帮助把公式和图像联系起来。',
      },
      {
        id: 'escape',
        startTime: '04:10',
        title: '为什么稳定方向有用',
        summary:
          '展示找到特征向量后，复杂矩阵可以沿少数关键方向被拆解和理解，降低分析难度。',
      },
      {
        id: 'eat-salt',
        startTime: '07:01',
        title: '与坐标系的关系',
        summary:
          '说明选择合适的基底会让变换表达更简单，为后续对角化和换基做铺垫。',
      },
      {
        id: 'motacilla-flava',
        startTime: '07:50',
        title: '常见误区',
        summary:
          '提醒不要把特征向量理解成“不会变化”的向量，它保持的是方向，长度通常仍会改变。',
      },
      {
        id: 'tree-bridge',
        startTime: '08:21',
        title: '从直觉回到计算',
        summary:
          '把几何问题转回代数问题：寻找使 Av 与 v 共线的非零向量和对应缩放因子。',
      },
      {
        id: 'march-home',
        startTime: '08:43',
        title: '学习检查点',
        summary:
          '总结本节应掌握的判断标准：能否解释特征向量、特征值以及它们如何揭示矩阵行为。',
      },
      {
        id: 'credits',
        startTime: '09:14',
        title: '后续衔接',
        summary:
          '连接到下一节的特征值计算：直觉建立之后，需要学会通过特征方程系统地找到这些方向。',
      },
    ],
  },
}
