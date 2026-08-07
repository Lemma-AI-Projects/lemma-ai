import { useTranslation } from 'react-i18next'
import { Separator } from '@/components/ui/separator'

/**
 * 设置 · 文档页
 * 展示产品叙事（投资 pitch v1，与 planning/lemma-ai-investor-pitch.md 对齐）。
 * 内容当前为中文（面向团队/投资人叙事）；英文本地化随 i18n 第二阶段。
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
        <p className="text-[15px] font-medium leading-7 text-zinc-900">
          别的 AI 教你知识；
          <br />
          我们训练的是「怎么教你」这件事本身。
        </p>
        <p className="mt-2 text-xs leading-6 text-zinc-500">
          通用 AI 助手用同一条流水线服务所有人。Lemma 为每一个学习者建一个会进化的
          <span className="font-medium text-zinc-700">认知模型</span>——每一次互动都在更新它，
          每一次教学决策都在对模型做优化。
        </p>
      </section>

      {/* 三个钩子 */}
      <section>
        <h3 className="text-sm font-medium text-zinc-900">三个数字钩子</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <HookCard title="学习基因组" desc="每个用户一份会进化的认知档案：知道你会什么、不会什么、卡在哪种不会、怎么学才学得进。" />
          <HookCard title="教学自进化" desc="系统在「学怎么教你」：教学策略被自己的教学结果训练。通用助手抄不了这条护城河。" />
          <HookCard title="Wait a Minute" desc="让 AI 先「等一下」：不急着给答案，先探清理解状态，再决定怎么讲。只对「真的学会」负责。" />
        </div>
      </section>

      {/* 差异化表 */}
      <section>
        <h3 className="text-sm font-medium text-zinc-900">差异化</h3>
        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200/80">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-100 text-zinc-500">
                <th className="px-3 py-2 font-medium">现有 AI 学习产品</th>
                <th className="px-3 py-2 font-medium">Lemma</th>
              </tr>
            </thead>
            <tbody className="text-zinc-700">
              <DiffRow before="记录「学没学会」" after="知识状态 = 概率（BKT / IRT 认知建模）" />
              <DiffRow before="复习排期用老算法" after="遗忘动力学（FSRS 级现代间隔算法）" />
              <DiffRow before="调难度靠拍脑袋" after="期望学习速率最大化——选最能让你进步的下一个知识点" />
              <DiffRow before="教法固定" after="教学策略被结果训练（教学自进化）" />
              <DiffRow before="每轮对话从零开始" after="WAM 协作协议：跨会话连续性 + 权重判断 + 证据验证" />
            </tbody>
          </table>
        </div>
      </section>

      {/* 杀手锏四件套 */}
      <section>
        <h3 className="text-sm font-medium text-zinc-900">杀手锏四件套</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <PillCard title="认知引擎" desc="Hermes learner 五层：identity / knowledge / patterns / episodes / meta_rules，7 张认知表。" />
          <PillCard title="伙伴工坊" desc="比游戏捏脸还诱人的 onboarding：捏一个懂你的老师（名字/性格/教法/脾气/直接改 SOUL.md），懒人一键模板。" />
          <PillCard title="LemmaX 考试面" desc="TOEFL / AP / 竞赛只是引擎的表征层：同一套认知引擎，换一张考卷。分数是过程指标，深理解才是终局。" />
          <PillCard title="WAM 协作协议" desc="「Wait a Minute」：AI 与用户状态同步、方向性 1% 推进、证据验证每一步。反功利的工程化。" />
        </div>
      </section>

      {/* 护城河 */}
      <section className="rounded-xl border border-emerald-200/80 bg-emerald-50 p-4">
        <h3 className="text-sm font-medium text-emerald-900">护城河 · 复利模型</h3>
        <p className="mt-2 text-xs leading-6 text-emerald-800">
          你学得越多 → 模型越懂你 → 教得越好 → 你学得越多。
          <br />
          学习者数据是燃料，教学自进化是引擎，学习基因组是资产。
        </p>
      </section>

      {/* 里程碑 */}
      <section>
        <h3 className="text-sm font-medium text-zinc-900">路线图</h3>
        <div className="mt-3 flex flex-col gap-2">
          <MilestoneRow m="M0" label="引擎地基（Hermes learner 合并、认知建模接入）" state="进行中" />
          <MilestoneRow m="M1" label="伴学闭环（人格注入、伙伴工坊 v1、learn space 容器）" state="进行中" />
          <MilestoneRow m="M2" label="自适应教学（WAM 六步循环、期望学习速率、LemmaX TOEFL）" state="规划中" />
          <MilestoneRow m="M3" label="主动智能（复习调度、学习报告、竞赛类考试面）" state="规划中" />
          <MilestoneRow m="M4" label="多模态 × 生态（Board 知识画布、多端触达）" state="规划中" />
        </div>
      </section>

      {/* 收口 */}
      <blockquote className="border-l-2 border-zinc-300 pl-3 text-xs leading-6 text-zinc-500">
        现在的 AI 学习产品像"书店里的一本书"——你得自己翻开、自己坚持。
        <br />
        Lemma 要做的是"身边的一个老师"——他认识你、跟着你、推着你，直到你真的学会。
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
  state: '进行中' | '规划中'
}) {
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
          state === '进行中'
            ? 'shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700'
            : 'shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500'
        }
      >
        {state}
      </span>
    </div>
  )
}
