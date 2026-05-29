export interface ProjectSource {
  id: string
  fileName: string
  // ISO date string, e.g. "2025-11-08". Formatted for display in the selector.
  addedDate: string
}

export const projectSources: Record<string, ProjectSource[]> = {
  '1': [
    {
      id: 's1-1',
      fileName: '你怎么成为了今天的你？回答版本.docx',
      addedDate: '2025-11-08',
    },
    { id: 's1-2', fileName: '第一轮对话记录.md', addedDate: '2025-09-25' },
    { id: 's1-3', fileName: '一路走来的经历.docx', addedDate: '2025-08-15' },
    {
      id: 's1-4',
      fileName: '拉投资行动纪实：从孤军奋战到资源汇聚的蜕变 (2).pdf',
      addedDate: '2025-08-13',
    },
  ],
  '2': [
    { id: 's2-1', fileName: '季度复盘.pptx', addedDate: '2025-10-12' },
    { id: 's2-2', fileName: '用户访谈整理.xlsx', addedDate: '2025-09-30' },
    { id: 's2-3', fileName: '竞品分析.pdf', addedDate: '2025-09-05' },
  ],
  '3': [
    { id: 's3-1', fileName: '素材合集.zip', addedDate: '2025-07-20' },
    { id: 's3-2', fileName: '封面设计.png', addedDate: '2025-07-18' },
  ],
  '4': [
    { id: 's4-1', fileName: '产品介绍.mp4', addedDate: '2025-07-01' },
    { id: 's4-2', fileName: '功能说明.docx', addedDate: '2025-06-25' },
  ],
  '5': [
    { id: 's5-1', fileName: '路演Pitch.pptx', addedDate: '2025-06-10' },
    { id: 's5-2', fileName: '财务模型.xlsx', addedDate: '2025-06-02' },
  ],
  '6': [
    { id: 's6-1', fileName: 'probability-review.pdf', addedDate: '2025-11-16' },
    { id: 's6-2', fileName: 'hypothesis-testing-notes.md', addedDate: '2025-11-02' },
  ],
  '7': [
    { id: 's7-1', fileName: 'sql-normalization-guide.pdf', addedDate: '2025-10-28' },
    { id: 's7-2', fileName: 'query-plan-examples.sql', addedDate: '2025-10-14' },
  ],
  '8': [
    { id: 's8-1', fileName: 'activation-metrics.xlsx', addedDate: '2025-09-22' },
    { id: 's8-2', fileName: 'experiment-readout.pptx', addedDate: '2025-09-09' },
  ],
}
