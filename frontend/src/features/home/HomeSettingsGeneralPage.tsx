import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  changeLanguage,
  SUPPORTED_LANGS,
  type LangCode,
} from '@/i18n'

export function HomeSettingsGeneralPage() {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language.startsWith('zh') ? 'zh' : 'en'

  return (
    <>
      <h2 className="text-lg font-normal text-zinc-900">{t('settings.general')}</h2>
      <Separator className="mt-4 bg-zinc-200" />

      <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 py-3">
        <span className="text-[16px] font-normal leading-7 text-zinc-600">
          {t('settings.language')}
        </span>
        <Select
          value={currentLang}
          onValueChange={(lang) => changeLanguage(lang as LangCode)}
        >
          <SelectTrigger size="sm" className="w-[112px] shadow-none">
            <SelectValue placeholder={t('settings.selectLanguage')} />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGS.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Separator className="bg-zinc-200" />
    </>
  )
}
