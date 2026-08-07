import { useTranslation } from 'react-i18next'
import { Separator } from '@/components/ui/separator'

/**
 * 设置 · 文档页
 * 展示产品叙事（投资 pitch v1，与 planning/lemma-ai-investor-pitch.md 对齐）。
 * 内容中英双语（i18n docs.* 命名空间，默认英文）。
 */
export function HomeSettingsDocsPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-normal text-zinc-900">{t('settings.docs')}</h2>
        <Separator className="mt-4 bg-zinc-200" />
      </div>

      {/* Hero · Thesis */}
      <section className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-5">
        <p className="whitespace-pre-line text-[15px] font-medium leading-7 text-zinc-900">
          {t('docs.thesis')}
        </p>
        <p className="mt-2 text-xs leading-6 text-zinc-500">{t('docs.thesisSub')}</p>
      </section>

      {/* 三个钩子 */}
      <section>
        <h3 className="text-sm font-medium text-zinc-900">{t('docs.hooksTitle')}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <HookCard title={t('docs.hook1Title')} desc={t('docs.hook1Desc')} />
          <HookCard title={t('docs.hook2Title')} desc={t('docs.hook2Desc')} />
          <HookCard title={t('docs.hook3Title')} desc={t('docs.hook3Desc')} />
        </div>
      </section>

      {/* 差异化表 */}
      <section>
        <h3 className="text-sm font-medium text-zinc-900">{t('docs.diffTitle')}</h3>
        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200/80">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-100 text-zinc-500">
                <th className="px-3 py-2 font-medium">{t('docs.diffHeader1')}</th>
                <th className="px-3 py-2 font-medium">{t('docs.diffHeader2')}</th>
              </tr>
            </thead>
            <tbody className="text-zinc-700">
              <DiffRow before={t('docs.diff1Before')} after={t('docs.diff1After')} />
              <DiffRow before={t('docs.diff2Before')} after={t('docs.diff2After')} />
              <DiffRow before={t('docs.diff3Before')} after={t('docs.diff3After')} />
              <DiffRow before={t('docs.diff4Before')} after={t('docs.diff4After')} />
              <DiffRow before={t('docs.diff5Before')} after={t('docs.diff5After')} />
            </tbody>
          </table>
        </div>
      </section>

      {/* 杀手锏四件套 */}
      <section>
        <h3 className="text-sm font-medium text-zinc-900">{t('docs.pillsTitle')}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <PillCard title={t('docs.pill1Title')} desc={t('docs.pill1Desc')} />
          <PillCard title={t('docs.pill2Title')} desc={t('docs.pill2Desc')} />
          <PillCard title={t('docs.pill3Title')} desc={t('docs.pill3Desc')} />
          <PillCard title={t('docs.pill4Title')} desc={t('docs.pill4Desc')} />
        </div>
      </section>

      {/* 护城河 */}
      <section className="rounded-xl border border-emerald-200/80 bg-emerald-50 p-4">
        <h3 className="text-sm font-medium text-emerald-900">{t('docs.moatTitle')}</h3>
        <p className="mt-2 whitespace-pre-line text-xs leading-6 text-emerald-800">
          {t('docs.moatDesc')}
        </p>
      </section>

      {/* 里程碑 */}
      <section>
        <h3 className="text-sm font-medium text-zinc-900">{t('docs.roadmapTitle')}</h3>
        <div className="mt-3 flex flex-col gap-2">
          <MilestoneRow m="M0" label={t('docs.m0')} state="doing" />
          <MilestoneRow m="M1" label={t('docs.m1')} state="doing" />
          <MilestoneRow m="M2" label={t('docs.m2')} state="planned" />
          <MilestoneRow m="M3" label={t('docs.m3')} state="planned" />
          <MilestoneRow m="M4" label={t('docs.m4')} state="planned" />
        </div>
      </section>

      {/* 收口 */}
      <blockquote className="whitespace-pre-line border-l-2 border-zinc-300 pl-3 text-xs leading-6 text-zinc-500">
        {t('docs.quote')}
      </blockquote>
    </div>
  )
}

function HookCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4">
      <p className="text-[13px] font-medium text-zinc-900">{title}</p>
      <p className="mt-1.5 text-xs leading-5 text-zinc-500">{desc}</p>
    </div>
  )
}

function DiffRow({ before, after }: { before: string; after: string }) {
  return (
    <tr className="border-t border-zinc-100">
      <td className="px-3 py-2 text-zinc-400">{before}</td>
      <td className="px-3 py-2 font-medium text-zinc-800">{after}</td>
    </tr>
  )
}

function PillCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4">
      <p className="text-[13px] font-medium text-zinc-900">{title}</p>
      <p className="mt-1.5 text-xs leading-5 text-zinc-500">{desc}</p>
    </div>
  )
}

function MilestoneRow({
  m,
  label,
  state,
}: {
  m: string
  label: string
  state: 'doing' | 'planned'
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-zinc-600">
          {m}
        </span>
        <span className="truncate text-xs text-zinc-700">{label}</span>
      </div>
      <span
        className={
          state === 'doing'
            ? 'shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700'
            : 'shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500'
        }
      >
        {state === 'doing' ? t('docs.mStateDoing') : t('docs.mStatePlanned')}
      </span>
    </div>
  )
}
