import {
  File,
  FileText,
  FileType,
  Image,
  Music,
  Presentation,
  Table,
  Video,
  type LucideIcon,
} from 'lucide-react'

export type FileCategory =
  | 'word'
  | 'pdf'
  | 'powerpoint'
  | 'spreadsheet'
  | 'video'
  | 'audio'
  | 'image'
  | 'default'

export const extToCategoryMap: Record<string, FileCategory> = {
  doc: 'word',
  docx: 'word',
  pdf: 'pdf',
  ppt: 'powerpoint',
  pptx: 'powerpoint',
  csv: 'spreadsheet',
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  mp4: 'video',
  mov: 'video',
  mp3: 'audio',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
}

export const categoryToIconMap: Record<FileCategory, LucideIcon> = {
  word: FileText,
  pdf: FileType,
  powerpoint: Presentation,
  spreadsheet: Table,
  video: Video,
  audio: Music,
  image: Image,
  default: File,
}

export const categoryToIconBgMap: Record<FileCategory, string> = {
  word: 'bg-blue-500',
  pdf: 'bg-red-500',
  powerpoint: 'bg-orange-500',
  spreadsheet: 'bg-emerald-500',
  video: 'bg-purple-500',
  audio: 'bg-pink-500',
  image: 'bg-indigo-500',
  default: 'bg-zinc-500',
}

export const categoryToLabelMap: Record<FileCategory, string> = {
  word: '文档',
  pdf: 'PDF',
  powerpoint: '演示文稿',
  spreadsheet: '电子表格',
  video: '视频',
  audio: '音频',
  image: '图片',
  default: '文件',
}

export function getFileCategory(fileName: string): FileCategory {
  const lastDotIndex = fileName.lastIndexOf('.')

  if (lastDotIndex === -1) {
    return 'default'
  }

  const extension = fileName.slice(lastDotIndex + 1).toLowerCase()

  return extToCategoryMap[extension] ?? 'default'
}

export function getFileCategoryIcon(fileName: string): LucideIcon {
  return categoryToIconMap[getFileCategory(fileName)]
}
