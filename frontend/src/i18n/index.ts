import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import zh from './locales/zh.json'

/**
 * Lemma 全局语言系统（i18n）
 * - 默认英文（产品面向全球用户），中文可切换
 * - 记忆：localStorage 'lemma-lang'（由设置页写入）；未设置时跟随浏览器
 * - 结构：按 feature 前缀分组的扁平 key（nav.* / auth.* / learnSpace.* / …）
 * - 语言名文案是各语言自己的（"English"/"简体中文"），不参与翻译
 */
export const SUPPORTED_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '简体中文' },
] as const

export type LangCode = (typeof SUPPORTED_LANGS)[number]['code']

export const STORAGE_KEY = 'lemma-lang'

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
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: STORAGE_KEY,
    },
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    react: { useSuspense: false },
  })
  .then(() => {
    // 初始化后同步 <html lang>（语言检测结果）
    document.documentElement.lang = i18n.language
  })

export default i18n
