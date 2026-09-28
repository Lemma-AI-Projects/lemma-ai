/**
 * 资料导入的共享约束。
 *
 * 前端先拦一次是为了省一次往返；后端 api/v1/pages.py 的 IMPORT_MAX_BYTES 与
 * 编码校验才是权威（前端拦不住改过的客户端）。两个入口共用这里的一份：
 * 文档系统的「导入」与对话面板顶栏的「上传文件」。
 */

export const IMPORT_MAX_BYTES = 1024 * 1024
export const IMPORT_EXTENSIONS = ['.md', '.markdown', '.txt']

export function isImportableName(name: string): boolean {
  const lower = name.toLowerCase()
  return IMPORT_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

// ---------------------------------------------------------------------------
// Materials (PDF / images): the binary half of the same story
// ---------------------------------------------------------------------------

/**
 * 上传资料（PDF/图片）的扩展名与上限。与后端 `services/material_storage.py` 的
 * `ALLOWED_MIME` / `MAX_BYTES` 是同一套约束 —— 前端拦一次只为省一次往返，
 * 后端那份才是权威（改过的客户端拦不住）。
 */
export const MATERIAL_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif']
export const MATERIAL_MAX_BYTES = 50 * 1024 * 1024

const EXTENSION_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

function extensionOfName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

export function isMaterialName(name: string): boolean {
  return MATERIAL_EXTENSIONS.includes(extensionOfName(name))
}

/**
 * 要发出去的 Content-Type。浏览器自己认出来的优先；它给不出时（Windows 上
 * 选中的文件常常 `type` 为空）按扩展名推 —— 否则空 Content-Type 会被后端
 * 以一个不成立的理由拒掉。
 */
export function materialMimeFor(file: File): string {
  return file.type || EXTENSION_MIME[extensionOfName(file.name)] || ''
}

export function describeMaterialError(error: unknown): string {
  switch (statusOf(error)) {
    case 413:
      return '文件超过 50 MB。'
    case 415:
      return '只支持 PDF 与图片（PNG / JPG / WebP / GIF）。'
    case 404:
      return '这个空间不在了。'
    case 503:
      return '资料层未启用（后端回 503），暂时传不上来。'
    default:
      return '上传失败，稍后再试。'
  }
}

export function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status
}

export function describeImportError(error: unknown): string {
  switch (statusOf(error)) {
    case 503:
      return '资料层未启用（后端回 503），暂时导不进来。'
    case 413:
      return '文件超过 1 MB。'
    case 415:
      return '这个文件的编码读不出来 —— V1 只认 UTF-8 文本。'
    case 404:
      return '这个空间不在了。'
    default:
      return '导入失败，稍后再试。'
  }
}