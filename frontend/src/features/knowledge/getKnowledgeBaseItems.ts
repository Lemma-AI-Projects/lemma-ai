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

/** 文件夹（分组容器）。`id` 由前端生成（演示）；后端接通后改为服务端主键。 */
export interface KnowledgeBaseFolder {
  id: string
  name: string
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
  /**
   * 所属文件夹。为 `null` 时落入「默认」文件夹（与用户自建文件夹同级的虚拟分组，
   * 用于承载所有尚未归组的内容）。
   */
  folderId: string | null
  /**
   * 本地预览地址（演示用），仅对可预览的媒体（图片/视频）存在。
   * 真实后端接通后，这里会换成上传接口返回的 CDN/对象存储 URL，语义不变。
   */
  previewUrl?: string
  /** 预览的媒体类型；video 用 <video> 循环播放，其余一律 <img>（GIF/SVG 原生动画）。 */
  previewKind?: 'image' | 'video'
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
      folderId: null,
    }
  })
}

/**
 * 前端上传演示：把一个本地 File 转成知识库列表项。
 *
 * 使用 `URL.createObjectURL` 生成临时预览地址，无需后端。后端接通后，
 * 这一整段应替换为「调上传接口 → 拿到持久化 URL」的逻辑，返回项的结构不变。
 */
export function createUploadedKnowledgeItem(file: File): KnowledgeBaseItem {
  const category = getFileCategory(file.name)
  const today = new Date()
  const isoDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
    today.getDate()
  )}`
  const previewKind: 'image' | 'video' | undefined =
    category === 'video' ? 'video' : category === 'image' ? 'image' : undefined
  // 只有能预览的媒体才生成 objectURL；PDF/文档等非媒体项不建无用的预览地址，
  // 这样 previewUrl 存在 ⇔ 能预览，网格/列表的 `Boolean(previewUrl)` 判断自动正确，
  // 也避免把 PDF 误塞进 <img> 导致裂图。
  const previewUrl = previewKind ? URL.createObjectURL(file) : undefined

  return {
    id: `kb-upload-${crypto.randomUUID()}`,
    fileName: file.name,
    displayName: getFileDisplayName(file.name),
    extensionLabel: getExtensionLabel(file.name),
    formattedModifiedAt: formatShortChineseDate(isoDate),
    sizeLabel: formatBytes(file.size),
    source: 'uploaded',
    category,
    categoryLabel: categoryToLabelMap[category],
    Icon: categoryToIconMap[category],
    iconColor: categoryToIconColorMap[category],
    folderId: null,
    previewUrl,
    previewKind,
  }
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  )
  const value = bytes / Math.pow(1024, exponent)
  return `${value >= 100 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${
    units[exponent]
  }`
}

/**
 * 触发真实下载。
 *
 * - 上传项（`previewUrl` 是用户选中文件的本地 objectURL）：下载的就是用户传上去的
 *   真实文件，字节级一致。
 * - 演示种子项（没有真实二进制，来自 `mock/knowledgeBaseItems.ts`）：生成一份元数据
 *   占位文本（`.txt`）下载，保证按钮在纯前端 demo 中始终可用。后端接通后，种子项会
 *   带上真实 `downloadUrl`，此占位分支可删除。
 */
export function triggerDownload(item: KnowledgeBaseItem): void {
  if (item.previewUrl) {
    downloadFromUrl(item.previewUrl, item.fileName)
    return
  }

  const note = [
    'Lemma AI · 知识库（演示数据）',
    '',
    `文件名：${item.fileName}`,
    `类型：${item.categoryLabel}`,
    `大小：${item.sizeLabel}`,
    `修改：${item.formattedModifiedAt}`,
    `来源：${item.source === 'uploaded' ? '已上传' : '已生成'}`,
    '',
    '说明：这是前端演示用的种子条目，没有真实二进制文件可供下载。',
    '接入后端后，此处将改为下载对象存储中的真实文件。',
  ].join('\n')
  const blob = new Blob([note], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  downloadFromUrl(url, `${item.displayName}.txt`)
  // 占位 blob 用完即回收（下一拍事件循环，确保下载已触发）
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function downloadFromUrl(url: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
