import { useCallback } from 'react'
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next, useTranslation } from 'react-i18next'

import type { TranslationKey } from './keys'
import en from './locales/en.json'
import zh from './locales/zh.json'

/**
 * Lemma 全局语言系统
 * - 默认中文：v2 现有界面文案以中文为主，未命中翻译时不该掉回英文
 * - 记忆：localStorage('lemma-lang')，未设置时跟随浏览器
 * - key 为扁平的 feature 前缀（nav.* / auth.* / settings.* / course.* …）
 * - 语言名是各语言自己的写法（English / 简体中文），不参与翻译
 */
export const SUPPORTED_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '简体中文' },
] as const

export type LangCode = (typeof SUPPORTED_LANGS)[number]['code']

export const STORAGE_KEY = 'lemma-lang'

export function currentLang(): LangCode {
  return i18n.language?.startsWith('en') ? 'en' : 'zh'
}

export function changeLanguage(lang: LangCode) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // localStorage 不可用时静默降级（会话内仍生效）
  }
  void i18n.changeLanguage(lang)
  document.documentElement.lang = lang
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    fallbackLng: 'zh',
    supportedLngs: ['en', 'zh'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: STORAGE_KEY,
    },
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    react: { useSuspense: false },
    // 覆盖率还不到全量的系统，缺 key 必须当场喊出来，而不是静默显示 key。
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (lngs, _ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] missing key "${key}" for ${lngs.join(', ')}`)
      }
    },
  })
  .then(() => {
    document.documentElement.lang = i18n.language
  })

/** 统一出口：组件一律用这个 hook，不要直接 import react-i18next，
 *  否则会绕过 TranslationKey 的类型约束。 */
export function useAppTranslation() {
  const { t, i18n: instance } = useTranslation()
  const typedT = useCallback(
    (key: TranslationKey, options?: Record<string, unknown>) =>
      // i18next 的返回类型带 returnDetails 分支，这里永远按字符串取。
      (t(key, options as never) as unknown) as string,
    [t]
  )

  return { t: typedT, i18n: instance }
}

export default i18n
