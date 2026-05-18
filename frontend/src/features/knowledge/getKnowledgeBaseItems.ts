import type { LucideIcon } from 'lucide-react'
import {
  categoryToIconMap,
  categoryToLabelMap,
  getFileCategory,
  type FileCategory,
} from '@/lib/fileType'
import {
  knowledgeBaseItems,
  type KnowledgeBaseSource,
} from '@/mock/knowledgeBaseItems'

const categoryToIconColorMap: Record<FileCategory, string> = {
  word: 'text-blue-500',
  pdf: 'text-red-500',
  powerpoint: 'text-orange-500',
  spreadsheet: 'text-emerald-500',
  video: 'text-purple-500',
  audio: 'text-pink-500',
  image: 'text-indigo-500',
  default: 'text-zinc-500',
}

export interface KnowledgeBaseItem {
  id: string
  fileName: string
  displayName: string
  extensionLabel: string
  formattedModifiedAt: string
  sizeLabel: string
  source: KnowledgeBaseSource['source']
  category: FileCategory
  categoryLabel: string
  Icon: LucideIcon
  iconColor: string
}

function formatShortChineseDate(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${Number(month)}月${Number(day)}日`
}

function getFileDisplayName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.')
  return lastDotIndex === -1 ? fileName : fileName.slice(0, lastDotIndex)
}

function getExtensionLabel(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.')
  return lastDotIndex === -1
    ? 'FILE'
    : fileName.slice(lastDotIndex + 1).toUpperCase()
}

export function getKnowledgeBaseItems(): KnowledgeBaseItem[] {
  return knowledgeBaseItems.map((item) => {
    const category = getFileCategory(item.fileName)

    return {
      id: item.id,
      fileName: item.fileName,
      displayName: getFileDisplayName(item.fileName),
      extensionLabel: getExtensionLabel(item.fileName),
      formattedModifiedAt: formatShortChineseDate(item.modifiedAt),
      sizeLabel: item.sizeLabel,
      source: item.source,
      category,
      categoryLabel: categoryToLabelMap[category],
      Icon: categoryToIconMap[category],
      iconColor: categoryToIconColorMap[category],
    }
  })
}
