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