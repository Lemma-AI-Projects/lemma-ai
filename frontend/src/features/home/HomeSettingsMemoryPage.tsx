import { Brain, Clock3, Database, ShieldCheck, Sparkles, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  useMemoryOverviewQuery,
  useReviewDueQuery,
} from '@/features/learner/learnerApi'

/**
 * 设置 · 记忆栏目（L1 主线闭环，2026-08-20）
 * 由 disabled 占位改为读接口驱动：掌握度概览 + 今日待复习来自真实 learner
 * 数据。写操作（暂停/清除）本期仍 disabled（D4：读先行，避免数据丢失风险）。
 * 门控关（overview.enabled===false）/后端不可达 => 优雅降级为「未启用」，不报错。
 */
export function HomeSettingsMemoryPage() {
  const { data: overview, isError } = useMemoryOverviewQuery()
  const enabled = overview?.enabled === true && !isError
  const { data: due = [], isLoading: dueLoading } = useReviewDueQuery(enabled)
  const buckets = overview?.masteryBuckets ?? { mastered: 0, learning: 0, new: 0 }

  return (
    <>
      <h2 className="text-lg font-normal text-zinc-900">记忆</h2>
      <Separator className="mt-4 bg-zinc-200" />

      {/* 引擎状态 */}
      <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 py-3">
        <span className="text-[16px] font-normal leading-7 text-zinc-600">
          学习记忆引擎
          <span className="block text-xs leading-5 text-zinc-400">
            Lemma Hermes learner
            {enabled ? ' · 已启用，正在记录学习轨迹' : ' · 未启用'}
          </span>
        </span>
        <Badge
          variant={enabled ? 'default' : 'outline'}
          className={enabled ? '' : 'text-zinc-400'}
        >
          {enabled ? <Database className="size-3" /> : <WifiOff className="size-3" />}
          {enabled ? '已启用' : '未启用'}
        </Badge>
      </div>
      <Separator className="bg-zinc-200" />

      {/* 能力说明（来自引擎 7 表） */}
      <div className="flex flex-col gap-3 py-4">
        <span className="text-[16px] font-normal leading-7 text-zinc-600">
          它会记住什么
        </span>
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2.5 text-sm text-zinc-600">
            <Brain className="mt-0.5 size-4 shrink-0 text-zinc-400" />
            <span>
              知识掌握度 —— 每个知识点"会 / 学习中 / 待复习"的状态与概率
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-zinc-600">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-zinc-400" />
            <span>
              学习模式 —— 你怎么学最有效（听例子快、看定义慢…）
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-zinc-600">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-zinc-400" />
            <span>复习队列 —— 按遗忘曲线安排今天该复习什么</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-zinc-600">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-zinc-400" />
            <span>教学策略 —— 教你的方法随你的学习结果不断校准</span>
          </div>
        </div>
      </div>
      <Separator className="bg-zinc-200" />

      {/* 知识掌握度概览 */}
      <div className="flex flex-col gap-3 py-4">
        <span className="text-[16px] font-normal leading-7 text-zinc-600">
          知识掌握度
          <span className="block text-xs leading-5 text-zinc-400">
            {enabled ? `共 ${overview?.conceptCount ?? 0} 个知识点` : '记忆引擎未启用'}
          </span>
        </span>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-zinc-200 p-3">
            <span className="block text-lg font-medium text-zinc-900">
              {enabled ? buckets.mastered : '—'}
            </span>
            <span className="block text-xs text-zinc-500">已掌握</span>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3">
            <span className="block text-lg font-medium text-zinc-900">
              {enabled ? buckets.learning : '—'}
            </span>
            <span className="block text-xs text-zinc-500">学习中</span>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3">
            <span className="block text-lg font-medium text-zinc-900">
              {enabled ? buckets.new : '—'}
            </span>
            <span className="block text-xs text-zinc-500">待学</span>
          </div>
        </div>
      </div>
      <Separator className="bg-zinc-200" />

      {/* 复习队列预览 */}
      <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 py-3">
        <span className="text-[16px] font-normal leading-7 text-zinc-600">
          今日待复习
          <span className="block text-xs leading-5 text-zinc-400">
            {enabled
              ? dueLoading
                ? '加载中…'
                : '按遗忘曲线安排 · 完成一项少一项'
              : '记忆引擎未启用'}
          </span>
        </span>
        <span className="text-sm text-zinc-600">
          {enabled && !dueLoading ? due.length : '—'}
        </span>
      </div>
      {enabled && !dueLoading && due.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-4">
          {due.map((d) => (
            <span
              key={d.nodeId}
              className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600"
            >
              {d.concept}
            </span>
          ))}
        </div>
      )}
      {enabled && !dueLoading && due.length === 0 && (
        <p className="pb-4 text-xs text-zinc-400">今日没有待复习，继续保持。</p>
      )}
      <Separator className="bg-zinc-200" />

      {/* 隐私控制 */}
      <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 py-3">
        <span className="text-[16px] font-normal leading-7 text-zinc-600">
          暂停记忆
          <span className="block text-xs leading-5 text-zinc-400">
            暂停后 AI 不再读写你的学习记忆
          </span>
        </span>
        <Switch disabled aria-label="暂停记忆（写入路径接入后启用）" />
      </div>
      <Separator className="bg-zinc-200" />

      <div className="flex items-center justify-between py-3">
        <span className="text-[16px] font-normal leading-7 text-zinc-600">
          清除全部记忆
          <span className="block text-xs leading-5 text-zinc-400">
            永久删除本空间的学习记忆，不可恢复
          </span>
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="rounded-full text-destructive"
        >
          清除
        </Button>
      </div>
    </>
  )
}