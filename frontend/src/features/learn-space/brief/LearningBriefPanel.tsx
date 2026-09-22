import type { ReactNode } from 'react'
import { ArrowRight, Check, Circle, RotateCw, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useKnowledgeStructureQuery } from './briefApi'
import {
  layoutStructure,
  type KnowledgeStructureRow,
} from './knowledgeStructure'
import type {
  LearningBrief,
  LearningBriefNextStep,
} from './types'

export interface LearningBriefPanelProps {
  /**
   * `undefined` = 板块未启用（不渲染，dock 槽位保持占位）；
   * `null` = 读取中；对象 = 有数据。
   */
  brief: LearningBrief | null | undefined
  onClose: () => void
  /** 打开「接下来」里的某一步：有 `href` 进课，有 `prompt` 则在当前空间开一段对话。 */
  onOpenStep: (step: LearningBriefNextStep) => void
  /** 「还没有课程」空态里的入口：在当前空间开一段对话（复用指挥室那条链路）。 */
  onStartConversation: () => void
  /** 手动重算。未接后端时不给 → 刷新按钮不渲染（不做点了没反应的按钮）。 */
  onRefresh?: () => void
  isRefreshing?: boolean
  className?: string
}

/**
 * Learning Brief：Learn Space 左侧的学习状态摘要板块。
 *
 * 两条规则决定了它的形态，不是装饰：
 * 1. **事实类来自数据库，判断类只允许在证据范围内总结，且允许整段缺席。**
 *    没有证据的段落直接不渲染 —— 所以「数据少」表现为「Brief 短」，
 *    而不是「Brief 在编」。
 * 2. **不量化。** `LearningBrief` 里没有任何数值字段，这里也没有
 *    progress bar / 百分比 / 评分；想显示也没东西可显示。
 */
export function LearningBriefPanel({
  brief,
  onClose,
  onOpenStep,
  onStartConversation,
  onRefresh,
  isRefreshing,
  className,
}: LearningBriefPanelProps) {

  // 板块未启用（undefined）：连外壳都不渲染 —— 调用方不需要再包一层判断，
  // 也不会在画布上留下一块空白的左侧栏。
  if (brief === undefined) return null

  const isEmptyBrief =
    brief != null &&
    !brief.doing?.length &&
    !brief.alreadyHave?.length &&
    !brief.developing?.length &&
    !brief.mainObstacle

  return (
    <aside
      aria-label="学习简报"
      className={cn(
        'flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-background',
        className
      )}
    >
      <header className="flex h-11 shrink-0 items-center justify-between pl-5 pr-2">
        <h2 className="text-sm font-medium text-foreground">
          学习简报
        </h2>
        <div className="flex items-center">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="重新生成"
              title="重新生成"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/10 disabled:cursor-default disabled:text-zinc-300"
            >
              <RotateCw className={cn('size-4', isRefreshing && 'animate-spin')} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭学习简报"
            title="关闭学习简报"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/10"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 scrollbar-fade overflow-y-auto px-5 pb-5">
        {brief === null ? (
          <BriefSkeleton />
        ) : brief ? (
          <>
            <GoalBlock brief={brief} />

            {/* Learner State Inspector：把那张图本身摊开 ——
                ✓ 已具备 / → 接下来可学 / ○ 还没轮到。
                它严格按先修顺序排，所以「下一步」永远是紧挨着已具备那一段的第一项。 */}
            <KnowledgeStructureBlock projectId={brief.projectId} />

            {brief.doing?.length ? (
              <BriefSection title="你正在做">
                <BriefBullets items={brief.doing} />
              </BriefSection>
            ) : null}

            {brief.alreadyHave?.length ? (
              <BriefSection title="你已经具备">
                <BriefBullets items={brief.alreadyHave} />
              </BriefSection>
            ) : null}

            {brief.developing?.length ? (
              <BriefSection title="正在形成">
                <BriefBullets items={brief.developing} />
              </BriefSection>
            ) : null}

            {brief.mainObstacle ? (
              <BriefSection title="目前的主要障碍">
                <p className="border-l-2 border-zinc-300 pl-3 text-[13px] leading-5 text-zinc-800">
                  {brief.mainObstacle}
                </p>
              </BriefSection>
            ) : null}

            <BriefSection title="接下来">
              {brief.nextSteps.length > 0 ? (
                <div className="space-y-1.5">
                  {brief.nextSteps.map((step, index) => (
                    <BriefStepRow
                      key={step.id}
                      step={step}
                      isPrimary={index === 0}
                      onOpen={() => onOpenStep(step)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 px-3 py-4 text-center">
                  <p className="text-[13px] leading-5 text-zinc-500">
                    这个空间还没有课程 —— 先聊一聊你想学什么。
                  </p>
                  <button
                    type="button"
                    onClick={onStartConversation}
                    className="mt-2.5 inline-flex h-8 items-center rounded-full bg-foreground px-3.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/20"
                  >
                    开一段对话
                  </button>
                </div>
              )}
            </BriefSection>

            {/* 诚实边界：判断类四段全缺席时，明确说明是因为证据还少，而不是「一切正常」。 */}
            {isEmptyBrief && (
              <p className="mt-5 text-xs leading-5 text-zinc-400">
                这个空间里的内容还很少。聊一聊、记几笔，或者建一门课，简报就会有内容。
              </p>
            )}

            {brief.generatedAt && (
              <p className="mt-5 text-xs text-zinc-400">
                {`更新于 ${formatBriefTime(brief.generatedAt)}`}
              </p>
            )}
          </>
        ) : null}
      </div>
    </aside>
  )
}

function GoalBlock({ brief }: { brief: LearningBrief }) {

  if (!brief.goal) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 px-3 py-2.5">
        <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
          学习目标
        </p>
        <p className="mt-1 text-[13px] leading-5 text-zinc-500">
          还没有设置学习目标
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
      <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
        学习目标
      </p>
      <p className="mt-1 text-[13px] leading-5 text-zinc-900">{brief.goal}</p>
      {brief.isGoalInferred && (
        <p className="mt-1.5 text-[11px] leading-4 text-zinc-400">
          根据本空间的课程推断
        </p>
      )}
    </div>
  )
}

function BriefSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="mt-5">
      <h3 className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}

/**
 * 知识结构（Learner State Inspector）。
 *
 * 三态来自派生，不是来自模型：✓ = 已具备，→ = 前提都在了（接下来可学），
 * ○ = 还没轮到。每条后面的「N 条记录」是结论背后的证据条数 —— 是计数，不是分数。
 *
 * 自我取数而不是由页面传入：`GET /knowledge/structure` 与简报是同一份派生，
 * 面板自己拿可以少穿两层 props，也让「结构块跟着简报一起出现」这件事不依赖页面
 * 记得多传一个参数。读不到时只让这一段说话，不连累整个简报。
 */
function KnowledgeStructureBlock({ projectId }: { projectId: string }) {
  const { structure, refetch, isRefreshing } =
    useKnowledgeStructureQuery(projectId)

  if (structure === undefined) {
    return (
      <BriefSection title="知识结构">
        <div className="rounded-xl border border-dashed border-amber-300 px-3 py-3">
          <p className="text-[13px] leading-5 text-zinc-600">
            读不到知识结构（后端没有回应）。
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isRefreshing}
            className="mt-2 text-xs text-foreground underline-offset-2 hover:underline disabled:opacity-60"
          >
            重试
          </button>
        </div>
      </BriefSection>
    )
  }

  if (structure === null) {
    return (
      <BriefSection title="知识结构">
        <div className="h-14 animate-pulse rounded-xl bg-muted" />
      </BriefSection>
    )
  }

  const rows = layoutStructure(structure)
  if (rows.length === 0) {
    return (
      <BriefSection title="知识结构">
        <p className="text-[13px] leading-5 text-zinc-500">
          这个空间还没有知识结构 —— 有了它，才谈得上「哪些会了、哪些接下来学」。
        </p>
      </BriefSection>
    )
  }

  return (
    <BriefSection title="知识结构">
      <ul className="space-y-1">
        {rows.map((row) => (
          <StructureRow key={row.id} row={row} />
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-4 text-zinc-400">
        <span className="text-emerald-600">✓</span> 已具备 ·{' '}
        <span className="text-foreground">→</span> 接下来可学 · ○ 还没轮到
      </p>
    </BriefSection>
  )
}

function StructureRow({ row }: { row: KnowledgeStructureRow }) {
  const mastered = row.value === 'mastered'
  return (
    <li className="flex items-start gap-2">
      <span className="mt-[3px] flex size-4 shrink-0 items-center justify-center">
        {mastered ? (
          <Check className="size-3.5 text-emerald-600" strokeWidth={3} />
        ) : row.isReady ? (
          <ArrowRight className="size-3.5 text-foreground" strokeWidth={2.5} />
        ) : (
          <Circle className="size-3 text-zinc-300" strokeWidth={2} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'text-[13px] leading-5',
            row.isReady && !mastered
              ? 'font-medium text-foreground'
              : mastered
                ? 'text-zinc-700'
                : 'text-zinc-500'
          )}
        >
          {row.label}
        </span>
        {row.evidenceCount > 0 && (
          <span className="ml-1.5 text-[11px] text-zinc-400">
            {row.evidenceCount} 条记录
          </span>
        )}
      </span>
    </li>
  )
}

function BriefBullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span
            aria-hidden
            className="mt-[7px] size-1 shrink-0 rounded-full bg-zinc-300"
          />
          <span className="min-w-0 text-[13px] leading-5 text-zinc-800">
            {item}
          </span>
        </li>
      ))}
    </ul>
  )
}

function BriefStepRow({
  step,
  isPrimary,
  onOpen,
}: {
  step: LearningBriefNextStep
  isPrimary: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px]',
        isPrimary
          ? 'bg-foreground text-background hover:opacity-90 focus-visible:ring-foreground/20'
          : 'border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 focus-visible:ring-foreground/10'
      )}
    >
      <span className="min-w-0 flex-1">
        {/* 两行而不是一行截断：标题就是这一步的全部信息，砍掉就只剩个残句。 */}
        <span
          className={cn(
            'line-clamp-2 text-[13px] font-medium',
            isPrimary ? 'text-background' : 'text-zinc-900'
          )}
        >
          {step.title}
        </span>
        {step.reason && (
          <span
            className={cn(
              'mt-0.5 block truncate text-xs',
              isPrimary ? 'text-background/70' : 'text-zinc-400'
            )}
          >
            {step.reason}
          </span>
        )}
      </span>
      <ArrowRight
        className={cn(
          'size-4 shrink-0 transition-colors',
          isPrimary
            ? 'text-background/80'
            : 'text-zinc-300 group-hover:text-zinc-600'
        )}
      />
    </button>
  )
}

function BriefSkeleton() {
  return (
    <div className="space-y-3 pt-1">
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded-md bg-muted"
          style={{ opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  )
}

/** 只用于「更新于」，不是学习度量。用界面语言而不是系统语言，否则切到英文还会显示中文时制。 */
function formatBriefTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
