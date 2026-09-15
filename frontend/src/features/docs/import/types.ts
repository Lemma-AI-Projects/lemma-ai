import type { TranslationKey } from '@/i18n/keys'

/**
 * 导入流程的领域类型。
 *
 * 落点规则（来自 `planning/kb-doc-layer-execution-plan.md` §5）：
 * 导入产物是 `pages(kind=imported)`，**必须落在单个 learn space 里**，
 * 不允许跨空间混入；文件夹成为 `kind=folder` 的容器页。
 */

export type ImportSourceKind = 'obsidian' | 'folder' | 'notion'

export interface ImportSourceOption {
  kind: ImportSourceKind
  /** 品牌来源用官方 logo（`public/icons` 下）；无品牌方为 null → 退化为 lucide 图标。 */
  logoSrc: string | null
  labelKey: TranslationKey
  hintKey: TranslationKey
  /** 需要先走第三方授权（Notion OAuth）。 */
  requiresAuth?: boolean
}

/** 源端解析出来的一个节点。id 是源端标识，将来落进 `pages.import_ref`。 */
export interface ImportTreeNode {
  id: string
  name: string
  kind: 'file' | 'folder'
  children?: ImportTreeNode[]
}

/** 落点候选：一个 learn space。 */
export interface ImportSpace {
  id: string
  name: string
}

export type ImportStep = 'source' | 'content' | 'destination' | 'result'

export interface ImportSelectionCount {
  files: number
  folders: number
}

/** 一次导入的完整草稿。步骤之间靠它传递，回退时不清空。 */
export interface ImportDraft {
  source: ImportSourceKind | null
  /** 勾选的节点 id（文件与文件夹都在里面）。 */
  selected: ReadonlySet<string>
  destinationId: string | null
}
