import type { ImportSpace, ImportSourceKind, ImportTreeNode } from '@/features/docs/import/types'

/**
 * 导入流程的评审用 mock（后端未接）。
 *
 * 三种来源各有一棵树，形状刻意不同 —— 目录树那一步是整条流程真正的难点，
 * 只用一棵规整的树测不出「深浅不一 / 夹层文件夹 / 单文件根节点」这些情况。
 * id 打成源端标识的形状（Obsidian 用路径、Notion 用 page_id），
 * 因为将来它要落进 `pages.import_ref`。
 */

export const importSpaces: ImportSpace[] = [
  { id: 'preview', name: '线性代数 · 第 12 讲' },
  { id: 'sp-2', name: '产品方法论' },
  { id: 'sp-3', name: '认知科学读书笔记' },
]

/** Obsidian vault：深、有夹层文件夹。 */
const obsidianTree: ImportTreeNode[] = [
  {
    id: '线性代数 vault',
    name: '线性代数 vault',
    kind: 'folder',
    children: [
      { id: '线性代数 vault/索引.md', name: '索引.md', kind: 'file' },
      {
        id: '线性代数 vault/数学',
        name: '数学',
        kind: 'folder',
        children: [
          {
            id: '线性代数 vault/数学/特征值与特征向量.md',
            name: '特征值与特征向量.md',
            kind: 'file',
          },
          {
            id: '线性代数 vault/数学/正交投影.md',
            name: '正交投影.md',
            kind: 'file',
          },
          {
            id: '线性代数 vault/数学/矩阵乘法.md',
            name: '矩阵乘法.md',
            kind: 'file',
          },
          {
            id: '线性代数 vault/数学/习题',
            name: '习题',
            kind: 'folder',
            children: [
              { id: '线性代数 vault/数学/习题/第一周 · 行列式.md', name: '第一周 · 行列式.md', kind: 'file' },
              { id: '线性代数 vault/数学/习题/第二周 · 秩.md', name: '第二周 · 秩.md', kind: 'file' },
              { id: '线性代数 vault/数学/习题/第三周 · 特征值.md', name: '第三周 · 特征值.md', kind: 'file' },
            ],
          },
        ],
      },
      {
        id: '线性代数 vault/认知科学',
        name: '认知科学',
        kind: 'folder',
        children: [
          { id: '线性代数 vault/认知科学/心智模型.md', name: '心智模型.md', kind: 'file' },
          { id: '线性代数 vault/认知科学/间隔重复.md', name: '间隔重复.md', kind: 'file' },
        ],
      },
      {
        id: '线性代数 vault/杂项',
        name: '杂项',
        kind: 'folder',
        children: [
          { id: '线性代数 vault/杂项/随手记 2026-08.md', name: '随手记 2026-08.md', kind: 'file' },
          { id: '线性代数 vault/杂项/待整理.md', name: '待整理.md', kind: 'file' },
        ],
      },
    ],
  },
]

/** 本地文件夹：浅、根节点直接是文件夹。 */
const folderTree: ImportTreeNode[] = [
  {
    id: 'project-notes',
    name: 'project-notes',
    kind: 'folder',
    children: [
      { id: 'project-notes/README.md', name: 'README.md', kind: 'file' },
      {
        id: 'project-notes/docs',
        name: 'docs',
        kind: 'folder',
        children: [
          { id: 'project-notes/docs/架构.md', name: '架构.md', kind: 'file' },
          { id: 'project-notes/docs/部署.md', name: '部署.md', kind: 'file' },
        ],
      },
      { id: 'project-notes/changelog.md', name: 'changelog.md', kind: 'file' },
    ],
  },
]

/** Notion：根层是页面而不是库（page_id 形状的 id）。 */
const notionTree: ImportTreeNode[] = [
  {
    id: '8f2a-product-wiki',
    name: '产品 wiki',
    kind: 'folder',
    children: [
      {
        id: '3c91-产品',
        name: '产品',
        kind: 'folder',
        children: [
          { id: 'a10f-需求池', name: '需求池', kind: 'file' },
          { id: 'b47c-竞品调研', name: '竞品调研', kind: 'file' },
          { id: 'c88e-路线图 Q3', name: '路线图 Q3', kind: 'file' },
        ],
      },
      {
        id: 'd52b-会议记录',
        name: '会议记录',
        kind: 'folder',
        children: [
          { id: 'e31a-0812 周会', name: '0812 周会', kind: 'file' },
          { id: 'f7d0-0826 周会', name: '0826 周会', kind: 'file' },
        ],
      },
      { id: '9b6f-读书笔记', name: '读书笔记', kind: 'file' },
    ],
  },
]

const TREES: Record<ImportSourceKind, ImportTreeNode[]> = {
  obsidian: obsidianTree,
  folder: folderTree,
  notion: notionTree,
}

export function treeForSource(kind: ImportSourceKind): ImportTreeNode[] {
  return TREES[kind]
}
