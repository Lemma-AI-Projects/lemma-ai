export interface KnowledgeBaseSource {
  id: string
  fileName: string
  // ISO date string, formatted as "M月D日" in the selector.
  modifiedAt: string
  sizeLabel: string
  source: 'uploaded' | 'generated'
}

export const knowledgeBaseItems: KnowledgeBaseSource[] = [
  {
    id: 'kb-1',
    fileName: 'team-usage-events-20887606-2026-05-13.csv',
    modifiedAt: '2026-05-13',
    sizeLabel: '6.61 KB',
    source: 'uploaded',
  },
  {
    id: 'kb-2',
    fileName: 'team-usage-events-20906105-2026-05-13.csv',
    modifiedAt: '2026-05-13',
    sizeLabel: '9.89 KB',
    source: 'uploaded',
  },
  {
    id: 'kb-3',
    fileName: 'team-usage-events-19702905-2026-04-09.csv',
    modifiedAt: '2026-04-10',
    sizeLabel: '10.6 KB',
    source: 'uploaded',
  },
  {
    id: 'kb-4',
    fileName: 'SecDecoding_中文译稿.md',
    modifiedAt: '2026-03-28',
    sizeLabel: '52.9 KB',
    source: 'generated',
  },
  {
    id: 'kb-5',
    fileName: '2025.findings-emnlp.1118.pdf',
    modifiedAt: '2026-03-28',
    sizeLabel: '2.86 MB',
    source: 'uploaded',
  },
  {
    id: 'kb-6',
    fileName: '2502.17601v1.pdf',
    modifiedAt: '2026-03-26',
    sizeLabel: '8.96 MB',
    source: 'uploaded',
  },
  {
    id: 'kb-7',
    fileName: 'Pasted text(2).txt',
    modifiedAt: '2026-03-24',
    sizeLabel: '5.29 KB',
    source: 'generated',
  },
  {
    id: 'kb-8',
    fileName: '产品资料截图.png',
    modifiedAt: '2026-03-21',
    sizeLabel: '842 KB',
    source: 'uploaded',
  },
  {
    id: 'kb-9',
    fileName: 'Lemma_AI_商业计划书_润色版.pdf',
    modifiedAt: '2026-03-15',
    sizeLabel: '7.11 MB',
    source: 'generated',
  },
]
