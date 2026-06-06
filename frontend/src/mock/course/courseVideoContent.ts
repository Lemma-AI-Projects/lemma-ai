export interface CourseVideoChapterSummary {
  id: string
  title: string
  summary: string
}

export interface CourseVideoCopy {
  source: string
  author: string
  courseInfoMarkdown: string
  chapterSummaries: CourseVideoChapterSummary[]
}

export const courseVideoContent: Record<string, CourseVideoCopy> = {
  'linear-algebra-lecture-12-unit-1-chapter-1': {
    source: 'MIT OpenCourseWare · Linear Algebra Lecture 12',
    author: 'Gilbert Strang',
    courseInfoMarkdown: `## 本课内容

本节从几何视角解释特征向量为什么重要。在线性变换中，大多数向量都会被旋转到新的方向，而特征向量仍停留在原来的直线上，只发生拉伸、压缩或翻转。

课程会从“稳定方向”的直觉出发，逐步连接到 **Av = λv** 的代数表达，并说明特征向量与特征值如何帮助我们理解矩阵所代表的空间动作。

## 关键概念

- **特征向量**：经过线性变换后方向保持不变的非零向量。
- **特征值**：描述特征向量在对应方向上被缩放、压缩或翻转的比例。
- **稳定方向**：在线性变换中不会偏离原直线的特殊方向。
- **几何解释**：把矩阵理解为对空间的作用，而不仅是一组需要计算的数字。
- **对角化基础**：用特征向量构造更自然的坐标系，使复杂变换更容易分析。

## 学完本节你将能…

- 用自己的语言解释特征向量和特征值的几何意义。
- 判断一个向量在线性变换后是否保持原有方向。
- 根据特征值的正负和大小，描述向量的拉伸、压缩与翻转。
- 将 **Av = λv** 与图像中的稳定方向联系起来。
- 说明特征向量为什么能简化矩阵分析，并为后续学习对角化建立直觉。`,
    chapterSummaries: [
      {
        id: 'forest',
        title: '建立直觉',
        summary:
          '从“稳定方向”的问题出发，说明为什么只看矩阵条目不够，需要观察变换如何作用在向量方向上。',
      },
      {
        id: 'camp-site',
        title: '线性变换中的方向变化',
        summary:
          '对比普通向量和特殊向量在变换后的表现，引出“方向保持不变”这一核心现象。',
      },
      {
        id: 'sprites',
        title: '特征向量的定义',
        summary:
          '把稳定方向形式化为 Av = λv，强调特征向量描述方向，特征值描述该方向上的缩放比例。',
      },
      {
        id: 'campfire',
        title: '特征值的几何含义',
        summary:
          '解释 λ 的正负和大小如何对应拉伸、压缩或反向，帮助把公式和图像联系起来。',
      },
      {
        id: 'escape',
        title: '为什么稳定方向有用',
        summary:
          '展示找到特征向量后，复杂矩阵可以沿少数关键方向被拆解和理解，降低分析难度。',
      },
      {
        id: 'eat-salt',
        title: '与坐标系的关系',
        summary:
          '说明选择合适的基底会让变换表达更简单，为后续对角化和换基做铺垫。',
      },
      {
        id: 'motacilla-flava',
        title: '常见误区',
        summary:
          '提醒不要把特征向量理解成“不会变化”的向量，它保持的是方向，长度通常仍会改变。',
      },
      {
        id: 'tree-bridge',
        title: '从直觉回到计算',
        summary:
          '把几何问题转回代数问题：寻找使 Av 与 v 共线的非零向量和对应缩放因子。',
      },
      {
        id: 'march-home',
        title: '学习检查点',
        summary:
          '总结本节应掌握的判断标准：能否解释特征向量、特征值以及它们如何揭示矩阵行为。',
      },
      {
        id: 'credits',
        title: '后续衔接',
        summary:
          '连接到下一节的特征值计算：直觉建立之后，需要学会通过特征方程系统地找到这些方向。',
      },
    ],
  },
}
