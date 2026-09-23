/**
 * The i18n seam this branch did not have.
 *
 * Free Course was written on the other branch, where every string goes through
 * `useAppTranslation()` and the dictionaries live in `i18n/locales/*.json`
 * behind i18next. This branch has no i18n layer at all — and the one thing that
 * must not happen is a second, quietly-diverging implementation that makes the
 * two branches impossible to merge.
 *
 * So this file deliberately does TWO things and nothing else:
 *
 *   1. It exposes **exactly the same surface** as the real module
 *      (`SUPPORTED_LANGS` / `LangCode` / `STORAGE_KEY` / `currentLang` /
 *      `changeLanguage` / `useAppTranslation`). When the real i18n lands here,
 *      deleting this file and dropping that one in changes **zero call sites**.
 *   2. It implements it with no dependencies — `t()` is a dotted lookup into the
 *      co-located dictionaries plus `{{var}}` interpolation, which is the whole
 *      of what Free Course uses. No i18next, no detector, no npm install on a
 *      branch whose frontend dependency set nobody asked me to touch.
 *
 * The dictionaries themselves are copies of the other branch's, key for key, so
 * a string fixed in one place is visibly fixed in the other.
 */

import { useCallback, useEffect, useState } from 'react'

import en from './locales/en'
import zh from './locales/zh'

export const SUPPORTED_LANGS = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
] as const

export type LangCode = (typeof SUPPORTED_LANGS)[number]['code']

export const STORAGE_KEY = 'lemma-lang'

type Dict = Record<string, unknown>

const DICTS: Record<LangCode, Dict> = {
  zh: zh as unknown as Dict,
  en: en as unknown as Dict,
}

function isLangCode(value: unknown): value is LangCode {
  return SUPPORTED_LANGS.some((lang) => lang.code === value)
}

function detectLang(): LangCode {
  if (typeof window === 'undefined') return 'zh'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isLangCode(stored)) return stored
  } catch {
    /* private mode — fall through to the navigator */
  }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'zh'
}

let current: LangCode = detectLang()
const listeners = new Set<() => void>()

export function currentLang(): LangCode {
  return current
}

export function changeLanguage(lang: LangCode): void {
  if (lang === current) return
  current = lang
  try {
    window.localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* private mode — the choice still holds for this session */
  }
  listeners.forEach((listener) => listener())
}

function lookup(dict: Dict, path: string): string | undefined {
  let node: unknown = dict
  for (const part of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Dict)[part]
  }
  return typeof node === 'string' ? node : undefined
}

/**
 * `{{var}}` substitution — i18next's default syntax, which is what the
 * dictionaries are written in. A missing variable is left as the literal
 * `{{name}}` rather than rendered as "undefined": a visible placeholder is a
 * bug report, an invisible one is a mystery.
 */
function interpolate(template: string, vars?: Record<string, unknown>): string {
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  )
}

export function translate(
  key: string,
  vars?: Record<string, unknown>,
  lang: LangCode = current
): string {
  const template = lookup(DICTS[lang], key) ?? lookup(DICTS.zh, key)
  // Falling back to the key itself is the honest failure: a missing string shows
  // up as `freeCourse.something` on screen instead of an empty gap.
  return interpolate(template ?? key, vars)
}

export function useAppTranslation() {
  const [lang, setLang] = useState<LangCode>(current)

  useEffect(() => {
    const listener = () => setLang(current)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, unknown>) => translate(key, vars, lang),
    [lang]
  )

  return { t, lang, changeLanguage }
}

// The real module default-exports its i18next instance. Nothing in Free Course
// touches it, but keeping a default export means an accidental `import i18n
// from '@/i18n'` fails at the call site rather than at the import.
export default { currentLang, changeLanguage, translate }
