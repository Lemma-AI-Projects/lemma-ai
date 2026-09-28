/**
 * 网格的分组规则 —— 纯函数，所以可以被单测，而不是只能被眼睛验收。
 *
 * 两个维度（用户的设计）：**类型**决定组，**来源**决定组内顺序与卡片上的标记。
 * 没有文件的页面（自己写的笔记、画布、文件夹）各自成组：网格回答的是
 * "这个空间里有什么"，不是"有哪些上传件"。
 *
 * 组序是固定的（先文件、后自产内容），空组不出现 —— 一个空组标题只会让人
 * 以为自己少看了什么。
 */

import { extToCategoryMap, type FileCategory } from '@/lib/fileType'
import type { DocPage } from '@/features/docs/types'

export type MaterialGroupKey =
  | 'pdf'
  | 'word'
  | 'spreadsheet'
  | 'presentation'
  | 'image'
  | 'media'
  | 'other'
  | 'note'
  | 'canvas'
  | 'folder'

export interface MaterialGroup {
  key: MaterialGroupKey
  label: string
  items: DocPage[]
}

/** 固定组序：文件类在前（按"看得见的多媒体"到"其它"），自产内容在后。 */
const GROUP_ORDER: MaterialGroupKey[] = [
  'pdf',
  'word',
  'spreadsheet',
  'presentation',
  'image',
  'media',
  'other',
  'note',
  'canvas',
  'folder',
]

const GROUP_LABELS: Record<MaterialGroupKey, string> = {
  pdf: 'PDF',
  word: '文档',
  spreadsheet: '表格',
  presentation: '幻灯片',
  image: '图片',
  media: '音视频',
  other: '其它文件',
  note: '笔记',
  canvas: '画布',
  folder: '文件夹',
}

/** 来源的中文说法（卡片上的小标记）。 */
export const SOURCE_LABELS: Record<string, string> = {
  upload: '上传',
  manual: '自己写的',
  notion: 'Notion',
  obsidian: 'Obsidian',
}

const CATEGORY_TO_GROUP: Record<FileCategory, MaterialGroupKey> = {
  pdf: 'pdf',
  word: 'word',
  spreadsheet: 'spreadsheet',
  powerpoint: 'presentation',
  image: 'image',
  video: 'media',
  audio: 'media',
  default: 'other',
}

/** 文件名 → 扩展名（小写、带点）。`originalName` 优先，退回 `importRef`。 */
export function extensionOf(page: DocPage): string {
  const name = page.originalName ?? page.importRef ?? ''
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

export function groupKeyOf(page: DocPage): MaterialGroupKey {
  if (page.kind === 'folder') return 'folder'
  if (page.kind === 'note') return 'note'
  if (page.kind === 'canvas') return 'canvas'
  // 到这里是 `imported`：有文件按扩展名，没有文件的（文本导入）算文档。
  const extension = extensionOf(page).replace('.', '')
  if (!extension) return 'word'
  return CATEGORY_TO_GROUP[extToCategoryMap[extension] ?? 'default']
}

/** 来源的展示顺序：上传的排前面，其余按固定次序，最后才是未知来源。 */
const SOURCE_RANK: Record<string, number> = {
  upload: 0,
  manual: 1,
  notion: 2,
  obsidian: 3,
}

function compareWithinGroup(a: DocPage, b: DocPage): number {
  const bySource = (SOURCE_RANK[a.source] ?? 9) - (SOURCE_RANK[b.source] ?? 9)
  if (bySource !== 0) return bySource
  return b.updatedAt.localeCompare(a.updatedAt)
}

/** `pages` → 非空分组，组序固定，组内按来源然后按新到旧。 */
export function groupMaterials(pages: DocPage[]): MaterialGroup[] {
  const buckets = new Map<MaterialGroupKey, DocPage[]>()
  for (const page of pages) {
    const key = groupKeyOf(page)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.push(page)
    } else {
      buckets.set(key, [page])
    }
  }

  return GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
    key,
    label: GROUP_LABELS[key],
    items: [...(buckets.get(key) as DocPage[])].sort(compareWithinGroup),
  }))
}

/** 文件夹里那一层：只留直接的子项（网格进入文件夹时用）。 */
export function childrenOf(pages: DocPage[], folderId: string | null): DocPage[] {
  return pages.filter((page) => page.parentPageId === folderId)
}
