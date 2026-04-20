import type { LucideIcon } from 'lucide-react'
import {
  categoryToIconBgMap,
  categoryToIconMap,
  categoryToLabelMap,
  getFileCategory,
} from '@/lib/fileType'
import { projectSources } from '@/mock/projectSources'

export interface ProjectSourceItem {
  id: string
  fileName: string
  categoryLabel: string
  formattedDate: string
  Icon: LucideIcon
  iconBg: string
}

function formatChineseDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

export function getProjectSourceItems(projectId: string): ProjectSourceItem[] {
  const sources = projectSources[projectId] ?? []

  return sources.map((source) => {
    const category = getFileCategory(source.fileName)
    return {
      id: source.id,
      fileName: source.fileName,
      categoryLabel: categoryToLabelMap[category],
      formattedDate: formatChineseDate(source.addedDate),
      Icon: categoryToIconMap[category],
      iconBg: categoryToIconBgMap[category],
    }
  })
}
