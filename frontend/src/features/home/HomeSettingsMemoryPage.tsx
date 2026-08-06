import { Brain, Clock3, Database, ShieldCheck, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

/**
 * 设置 · 记忆栏目（v1）
 * 基于 Lemma Hermes learner 记忆引擎（7 表：identity / knowledge_nodes /
 * knowledge_edges / learning_patterns / learning_episodes / meta_rules /
 * review_queue）设计 UI 骨架。数据接入随 E1/T2.1（learner 接入后端），
 * 当前为「内核就绪、数据接入中」的诚实占位：控件 disabled 并注明。
 */
export function HomeSettingsMemoryPage() {
  return (
    <>
      <h2 className="text-lg font-normal text-zinc-900">记忆</h2>
      <Separator className="mt-4 bg-zinc-200" />

      {/* 引擎状态 */}
      <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 py-3">
        <span className="text-[16px] font-normal leading-7 text-zinc-600">
          学习记忆引擎
          <span className="block text-xs leading-5 text-zinc-400">
            Lemma Hermes learner · 内核就绪，数据接入中
          </span>
        </span>
        <Badge variant="outline" className="gap-1 text-zinc-500">
          <Database className="size-3" />
          接入中
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

      {/* 复习队列预览 */}
      <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 py-3">
        <span className="text-[16px] font-normal leading-7 text-zinc-600">
          今日待复习
          <span className="block text-xs leading-5 text-zinc-400">
            复习队列接入后在此显示
          </span>
        </span>
        <span className="text-sm text-zinc-300">—</span>
      </div>
      <Separator className="bg-zinc-200" />

      {/* 隐私控制 */}
      <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 py-3">
        <span className="text-[16px] font-normal leading-7 text-zinc-600">
          暂停记忆
          <span className="block text-xs leading-5 text-zinc-400">
            暂停后 AI 不再读写你的学习记忆
          </span>
        </span>
        <Switch disabled aria-label="暂停记忆（引擎接入后启用）" />
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
