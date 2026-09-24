import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CourseAssistantInput } from '@/features/course/CourseAssistantInput'
import { CourseConversationPills } from '@/features/course/CourseConversationPills'
import { CourseQuizView } from '@/features/course/quiz/CourseQuizView'
import {
  QuestionSetBrowser,
  useQuestionSetsQuery,
  type QuizFlowPhase,
} from '@/features/question'
import { cn } from '@/lib/utils'

type SandboxView = 'flow' | 'answer' | 'preview'

const SANDBOX_VIEWS: { value: SandboxView; label: string }[] = [
  { value: 'flow', label: '流程' },
  { value: 'answer', label: '逐题作答' },
  { value: 'preview', label: '逐题预览' },
]

function isSandboxView(value: string | null): value is SandboxView {
  return value === 'flow' || value === 'answer' || value === 'preview'
}

// [sandbox] 题库调试页：题组来自 fixture 适配器，沿用学习点页的双栏尺寸；伴学栏不发请求，
// 窄视口下收起，把宽度留给题面。
export function CourseQuizSandboxPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [runKey, setRunKey] = useState(0)
  const [phase, setPhase] = useState<QuizFlowPhase>('loading')
  const setsQuery = useQuestionSetsQuery()

  const sets = setsQuery.data ?? []
  const requestedSetId = searchParams.get('set')
  const setId = sets.some((set) => set.id === requestedSetId) ? requestedSetId : (sets[0]?.id ?? null)
  const viewParam = searchParams.get('view')
  const view: SandboxView = isSandboxView(viewParam) ? viewParam : 'flow'
  const answering = view === 'flow' && phase === 'answering'

  const updateParams = (next: { set?: string; view?: SandboxView }) => {
    const params = new URLSearchParams(searchParams)
    if (next.set) params.set('set', next.set)
    if (next.view) params.set('view', next.view)
    setSearchParams(params, { replace: true })
    setRunKey((current) => current + 1)
  }

  return (
    <div className="flex h-full gap-2">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-50">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200/80 px-3 py-2">
          <span className="text-xs font-medium text-zinc-400">题库调试</span>
          <Select
            value={setId ?? ''}
            onValueChange={(value) => updateParams({ set: value })}
            disabled={sets.length === 0}
          >
            <SelectTrigger size="sm" className="h-7 min-w-0 max-w-72 bg-white text-xs" aria-label="选择题组">
              <SelectValue placeholder="选择题组" />
            </SelectTrigger>
            <SelectContent>
              {sets.map((set) => (
                <SelectItem key={set.id} value={set.id}>
                  {set.title}（{set.questionCount} 题 · {set.mode === 'batch' ? '统一提交' : '逐题'}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div role="radiogroup" aria-label="视图" className="flex rounded-full bg-zinc-200/60 p-0.5">
            {SANDBOX_VIEWS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={view === option.value}
                onClick={() => updateParams({ view: option.value })}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs transition-colors',
                  view === option.value ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label="重新开始"
            title="重新开始"
            className="ml-auto size-6 rounded-full bg-transparent p-0 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
            onClick={() => setRunKey((current) => current + 1)}
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1">
          {setsQuery.isError ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">题组加载失败</div>
          ) : !setId ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">题组加载中…</div>
          ) : view === 'flow' ? (
            <CourseQuizView
              key={`${setId}-${runKey}`}
              questionSetId={setId}
              nextHref="/sandbox/quiz"
              onExit={() => navigate('/sandbox')}
              onPhaseChange={setPhase}
            />
          ) : (
            <QuestionSetBrowser key={`${setId}-${view}-${runKey}`} setId={setId} mode={view} />
          )}
        </div>
      </main>

      <aside className="hidden w-82 shrink-0 flex-col rounded-md border border-zinc-200/80 bg-zinc-50 p-3 lg:flex">
        <div className="-mt-1 flex h-7 shrink-0 items-center">
          <CourseConversationPills conversations={[]} />
        </div>
        <div className="scrollbar-fade -mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
          <div className="flex min-h-full items-center justify-center px-4 py-10 text-center">
            <p className="text-sm text-zinc-400">
              {answering ? '测验进行中，AI 伴学暂时关闭。' : 'No conversation yet.'}
            </p>
          </div>
        </div>
        <CourseAssistantInput
          className="pointer-events-none mt-3 shrink-0"
          disabled
          isStreaming={false}
          onSend={() => undefined}
          onStop={() => undefined}
          onValueChange={() => undefined}
          placeholder={answering ? '测验期间暂不可用' : '问问关于本节的任何问题…'}
          value=""
        />
      </aside>
    </div>
  )
}
