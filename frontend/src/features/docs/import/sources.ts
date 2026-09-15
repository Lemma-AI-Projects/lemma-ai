import type { ImportSourceOption, ImportStep } from './types'
import type { TranslationKey } from '@/i18n/keys'

/**
 * 三种来源。顺序即展示顺序：两个「不需要授权」的放前面，
 * 需要 OAuth 的 Notion 放最后 —— 用户点得进的地方先给。
 */
export const IMPORT_SOURCES: ImportSourceOption[] = [
  {
    kind: 'obsidian',
    logoSrc: '/icons/obsidian.svg',
    labelKey: 'import.sourceObsidian',
    hintKey: 'import.sourceObsidianHint',
  },
  {
    kind: 'folder',
    logoSrc: null,
    labelKey: 'import.sourceFolder',
    hintKey: 'import.sourceFolderHint',
  },
  {
    kind: 'notion',
    logoSrc: '/icons/notion.svg',
    labelKey: 'import.sourceNotion',
    hintKey: 'import.sourceNotionHint',
    requiresAuth: true,
  },
]

export const IMPORT_STEPS: { step: ImportStep; labelKey: TranslationKey }[] = [
  { step: 'source', labelKey: 'import.stepSource' },
  { step: 'content', labelKey: 'import.stepContent' },
  { step: 'destination', labelKey: 'import.stepDestination' },
  { step: 'result', labelKey: 'import.stepResult' },
]

export function stepIndex(step: ImportStep): number {
  return IMPORT_STEPS.findIndex((item) => item.step === step)
}

/** 来源 → 选项（结果页、图标都要回查）。 */
export function findSource(kind: ImportSourceOption['kind']): ImportSourceOption {
  const found = IMPORT_SOURCES.find((item) => item.kind === kind)
  if (!found) throw new Error(`unknown import source: ${kind}`)
  return found
}
